package com.grocery.microservices.product.config;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Requires a non-blank immutable {@code sub} claim, the canonical customer identity.
 */
public final class SubjectClaimValidator implements OAuth2TokenValidator<Jwt> {

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Object subject = jwt.getSubject();
        if (subject instanceof String sub && !sub.isBlank()) {
            return OAuth2TokenValidatorResult.success();
        }
        OAuth2Error error = new OAuth2Error(OAuth2ErrorCodes.INVALID_TOKEN,
                "The required 'sub' claim is missing or blank", null);
        return OAuth2TokenValidatorResult.failure(error);
    }
}