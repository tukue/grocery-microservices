package com.grocery.microservices.gateway.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Mono;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.Optional;

/**
 * Rate-limiting configuration: owns the {@link KeyResolver} and
 * {@link RedisRateLimiter} beans consumed by {@link GatewayRoutesConfig}.
 *
 * <h3>Key resolution strategy</h3>
 * <ol>
 *   <li>{@code X-Forwarded-For} — set by a load balancer or reverse proxy.
 *       Leftmost IP is the original client before any intermediary hops.</li>
 *   <li>TCP remote address — used when no proxy header is present (e.g., direct
 *       Docker Compose connections in dev).</li>
 *   <li>{@code "unknown"} — fallback so the limiter still functions rather than
 *       throwing when neither source is available.</li>
 * </ol>
 *
 * <h3>Production trust model</h3>
 * Trusting {@code X-Forwarded-For} is safe only when the gateway is unreachable
 * directly from the internet — it must accept traffic only from the load
 * balancer's security group. An attacker reaching the gateway directly could
 * spoof the header to bypass per-IP limits. XFF is only trusted when it comes
 * from a configured trusted proxy IP; otherwise the remote address is used.
 *
 * <h3>Configuration</h3>
 * Set {@code gateway.trusted-proxies} to a comma-separated list of trusted
 * proxy IP addresses (e.g. the load balancer or nginx ingress IP). When
 * {@code trusted-proxies} is empty or not configured, XFF is not trusted and
 * the remote address is always used as a safety default for untrusted deployments.
 *
 * <h3>Future enhancement</h3>
 * Swap IP-based keying for the authenticated user's {@code sub} claim when
 * per-user rate limiting is needed:
 * <pre>
 *   return exchange -> exchange.getPrincipal()
 *       .map(Principal::getName)
 *       .defaultIfEmpty("anonymous");
 * </pre>
 */
@Configuration
@EnableConfigurationProperties(GatewayProperties.class)
public class RateLimitConfig {

    private final GatewayProperties props;

    public RateLimitConfig(GatewayProperties props) {
        this.props = props;
    }

    /**
     * Resolves the rate-limit bucket key from the inbound request.
     *
     * <p>Marked {@link Primary} so the {@code RequestRateLimiter} filter picks
     * this resolver when no explicit resolver name is configured on the route.</p>
     */
    @Bean
    @Primary
    public KeyResolver ipKeyResolver() {
        List<String> trustedProxies = props.trustedProxies();

        return exchange -> {
            String xForwardedFor = exchange.getRequest()
                    .getHeaders()
                    .getFirst("X-Forwarded-For");

            if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                // XFF is comma-separated; leftmost value is the original client IP
                String clientIp = xForwardedFor.split(",")[0].trim();
                // Only trust XFF when it comes from a configured trusted proxy
                if (trustedProxies != null && !trustedProxies.isEmpty() && trustedProxies.contains(clientIp)) {
                    return Mono.just(clientIp);
                }
                // Untrusted XFF — fall through to remote address
            }

            String remoteAddress = Optional
                    .ofNullable(exchange.getRequest().getRemoteAddress())
                    .map(InetSocketAddress::getAddress)
                    .map(InetAddress::getHostAddress)
                    .orElse("unknown");

            return Mono.just(remoteAddress);
        };
    }

    /**
     * Redis token-bucket rate limiter shared across all {@code /api/customer/**}
     * routes.
     *
     * <p>Declared as a Spring bean so the underlying reactive Redis connection
     * is managed by the application context and properly shut down on stop.
     * The Lua script implementing the token bucket executes atomically in Redis
     * — rate-limit state is consistent across all gateway replicas.</p>
     */
    @Bean
    public RedisRateLimiter customerRateLimiter() {
        GatewayProperties.RateLimit rl = props.rateLimit();
        return new RedisRateLimiter(
                rl.replenishRate(),
                rl.burstCapacity(),
                rl.requestedTokens()
        );
    }
}
