package com.grocery.microservices.cart.config;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;

/**
 * Requires the audience claim to contain the configured {@code security.jwt.audience}.
 * Accepts a single string audience or an array of audiences.
 */
public final class AudienceValidator implements OAuth2TokenValidator<Jwt> {

    private final String expectedAudience;

    public AudienceValidator(String expectedAudience) {
        this.expectedAudience = expectedAudience;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Object audience = jwt.getClaim("aud");
        boolean matches = audience instanceof String value
                ? expectedAudience.equals(value)
                : audience instanceof Collection<?> values && values.contains(expectedAudience);
        if (matches) {
            return OAuth2TokenValidatorResult.success();
        }
        OAuth2Error error = new OAuth2Error(OAuth2ErrorCodes.INVALID_TOKEN,
                "The required 'aud' claim is invalid or missing", null);
        return OAuth2TokenValidatorResult.failure(error);
    }
}