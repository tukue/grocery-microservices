package com.grocery.microservices.cart.config;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPublicKey;
import java.text.ParseException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Development-only demo identity provider. Generates an ephemeral RSA key pair
 * at startup, mints short-lived RS256 access tokens and serves OpenID Connect
 * discovery + JWKS so the application can validate its own tokens exactly like
 * a production identity provider.
 *
 * <p>Never enabled outside the {@code dev} profile. Endpoints are served by
 * {@link DemoIdentityController}.</p>
 */
@Component
@Profile({"dev", "docker"})
public class DemoIdentityProvider {

    private final JwtProperties jwtProperties;
    private final KeyPair keyPair;
    private final String keyId;
    private final JWKSet publicJwkSet;
    private final RSASSASigner signer;

    public DemoIdentityProvider(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            this.keyPair = generator.generateKeyPair();
            this.signer = new RSASSASigner(keyPair.getPrivate());
            this.keyId = UUID.randomUUID().toString();
            this.publicJwkSet = new JWKSet(rsaPublicKey());
        } catch (NoSuchAlgorithmException | JOSEException ex) {
            throw new IllegalStateException("Unable to initialise the demo identity provider", ex);
        }
    }

    public String mintAccessToken() {
        Instant now = Instant.now();
        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .issuer(jwtProperties.issuerUri())
                    .subject(jwtProperties.demoSub())
                    .audience(List.of(jwtProperties.audience()))
                    .issueTime(java.util.Date.from(now))
                    .expirationTime(java.util.Date.from(now.plusSeconds(jwtProperties.demoTokenTtlSeconds())))
                    .claim("scope", jwtProperties.demoScopes())
                    .jwtID(UUID.randomUUID().toString())
                    .build();
            SignedJWT signedJwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(keyId).build(), claims);
            signedJwt.sign(signer);
            return signedJwt.serialize();
        } catch (JOSEException ex) {
            throw new IllegalStateException("Unable to sign the demo access token", ex);
        }
    }

    public boolean acceptsCredentials(String username, String password) {
        return jwtProperties.demoUsername().equals(username) && jwtProperties.demoPassword().equals(password);
    }

    public String issuerUri() {
        return jwtProperties.issuerUri();
    }

    public String buildDiscoveryDocument() {
        return """
                {
                  "issuer": "%s",
                  "jwks_uri": "%s/.well-known/jwks.json",
                  "token_endpoint": "%s/auth/login",
                  "subject_types_supported": ["public"],
                  "id_token_signing_alg_values_supported": ["%s"],
                  "response_types_supported": ["token"]
                }
                """.formatted(issuerUri(), issuerUri(), issuerUri(), jwtProperties.algorithm());
    }

    public String buildPublicJwkSet() throws ParseException {
        return JWKSet.parse(publicJwkSet.toString()).toPublicJWKSet().toString();
    }

    private RSAKey rsaPublicKey() throws JOSEException {
        return new RSAKey.Builder((RSAPublicKey) keyPair.getPublic())
                .keyID(keyId)
                .algorithm(JWSAlgorithm.RS256)
                .build();
    }
}