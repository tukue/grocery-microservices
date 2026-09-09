package com.grocery.microservices.cart.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "security.jwt")
public record JwtProperties(
        String issuerUri,
        String audience,
        @DefaultValue("RS256") String algorithm,
        @DefaultValue("false") boolean demoEnabled,
        @DefaultValue("customer-f7b1b25c") String demoSub,
        @DefaultValue("${DEMO_USERNAME:demo-user}") String demoUsername,
        @DefaultValue("${DEMO_PASSWORD:}") String demoPassword,
        @DefaultValue("cart:read cart:write order:read order:write summary:read product:admin") String demoScopes,
        @DefaultValue("300") long demoTokenTtlSeconds) {

    public boolean hasIssuerUri() {
        return issuerUri != null && !issuerUri.isBlank();
    }
}