package com.grocery.microservices.order.config;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Pins the accepted JOSE signature algorithm (e.g. RS256) so tokens signed with
 * any other algorithm are rejected before authentication is established.
 */
public final class AllowedAlgorithmValidator implements OAuth2TokenValidator<Jwt> {

    private final String expectedAlgorithm;

    public AllowedAlgorithmValidator(String expectedAlgorithm) {
        this.expectedAlgorithm = expectedAlgorithm.toUpperCase();
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Object algorithm = jwt.getHeaders().get("alg");
        boolean matches = algorithm instanceof String value && expectedAlgorithm.equalsIgnoreCase(value);
        if (matches) {
            return OAuth2TokenValidatorResult.success();
        }
        OAuth2Error error = new OAuth2Error(OAuth2ErrorCodes.INVALID_TOKEN,
                "The token signing algorithm is not allowed", null);
        return OAuth2TokenValidatorResult.failure(error);
    }
}