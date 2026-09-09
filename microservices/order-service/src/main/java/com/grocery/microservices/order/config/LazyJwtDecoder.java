package com.grocery.microservices.order.config;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.util.function.Supplier;

/**
 * Defers the construction of the real {@link NimbusJwtDecoder} until the first
 * token needs decoding. This lets an application that hosts its own development
 * issuer (demo profile) start up before performing issuer/JWKS discovery.
 */
public final class LazyJwtDecoder implements JwtDecoder {

    private final Supplier<NimbusJwtDecoder> supplier;
    private volatile NimbusJwtDecoder delegate;

    public LazyJwtDecoder(Supplier<NimbusJwtDecoder> supplier) {
        this.supplier = supplier;
    }

    @Override
    public Jwt decode(String token) {
        return getDelegate().decode(token);
    }

    private NimbusJwtDecoder getDelegate() {
        NimbusJwtDecoder result = this.delegate;
        if (result == null) {
            synchronized (this) {
                result = this.delegate;
                if (result == null) {
                    result = this.supplier.get();
                    this.delegate = result;
                }
            }
        }
        return result;
    }
}