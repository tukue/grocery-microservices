package com.grocery.microservices.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Cloud Gateway entry point.
 *
 * <p>Runs on Reactor Netty (WebFlux). Do NOT add @EnableWebMvc or any servlet
 * dependency; WebFlux and the Servlet stack are mutually exclusive.</p>
 *
 * <p>Responsibilities handled by this process:</p>
 * <ul>
 *   <li>Path-based routing to cart, order, product, and summary services</li>
 *   <li>JWT relay — forwards the inbound Authorization header downstream</li>
 *   <li>Centralised CORS policy for browser callers</li>
 *   <li>Redis-backed token-bucket rate limiting per client IP</li>
 *   <li>Actuator health + Prometheus metrics</li>
 * </ul>
 */
@SpringBootApplication
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
