package com.grocery.microservices.order.config;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Test-only asymmetric key fixture shared across cart, order, product and
 * summary service tests so that the same test issuer and customer identity are
 * validated consistently end to end.
 */
public final class TestJwtSupport {

    public static final String TEST_ISSUER = "https://grocery-test.example.test";
    public static final String TEST_AUDIENCE = "grocery-api";
    public static final String DEFAULT_SCOPES = "cart:read cart:write order:read order:write order:create summary:read product:admin";

    private static final KeyPair KEY_PAIR = generateKeyPair();
    private static final String KEY_ID = "test-rs256-key";

    private TestJwtSupport() {
    }

    public static String validToken(String sub) {
        Instant now = Instant.now();
        return mintToken(sub, DEFAULT_SCOPES, now, now.plusSeconds(300), TEST_ISSUER, TEST_AUDIENCE);
    }

    public static String tokenWithScopes(String sub, String scopes) {
        Instant now = Instant.now();
        return mintToken(sub, scopes, now, now.plusSeconds(300), TEST_ISSUER, TEST_AUDIENCE);
    }

    public static String expiredToken(String sub) {
        Instant now = Instant.now();
        return mintToken(sub, DEFAULT_SCOPES, now.minusSeconds(120), now.minusSeconds(60), TEST_ISSUER, TEST_AUDIENCE);
    }

    public static String tokenSignedWithWrongIssuer(String sub) {
        Instant now = Instant.now();
        return mintToken(sub, DEFAULT_SCOPES, now, now.plusSeconds(300), "https://evil.example.test", TEST_AUDIENCE);
    }

    public static String tokenSignedForWrongAudience(String sub) {
        Instant now = Instant.now();
        return mintToken(sub, DEFAULT_SCOPES, now, now.plusSeconds(300), TEST_ISSUER, "some-other-api");
    }

    public static String tokenWithoutSubject() {
        Instant now = Instant.now();
        return mintToken(null, DEFAULT_SCOPES, now, now.plusSeconds(300), TEST_ISSUER, TEST_AUDIENCE);
    }

    public static String tokenSignedWithDifferentKey(String sub) {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair other = generator.generateKeyPair();
            Instant now = Instant.now();
            JWTClaimsSet claims = claims(sub, DEFAULT_SCOPES, now, now.plusSeconds(300), TEST_ISSUER, TEST_AUDIENCE);
            SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("other-key").build(), claims);
            jwt.sign(new RSASSASigner(other.getPrivate()));
            return jwt.serialize();
        } catch (NoSuchAlgorithmException | JOSEException ex) {
            throw new IllegalStateException(ex);
        }
    }

    public static JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) KEY_PAIR.getPublic())
                .signatureAlgorithm(SignatureAlgorithm.RS256)
                .build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new SubjectClaimValidator(),
                new JwtTimestampValidator(),
                new JwtIssuerValidator(TEST_ISSUER),
                new AudienceValidator(TEST_AUDIENCE),
                new AllowedAlgorithmValidator("RS256")
        ));
        return decoder;
    }

    private static String mintToken(String sub, String scopes, Instant issuedAt, Instant expiresAt,
                                    String issuer, String audience) {
        try {
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(KEY_ID).build(),
                    claims(sub, scopes, issuedAt, expiresAt, issuer, audience));
            jwt.sign(new RSASSASigner(KEY_PAIR.getPrivate()));
            return jwt.serialize();
        } catch (JOSEException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static JWTClaimsSet claims(String sub, String scopes, Instant issuedAt, Instant expiresAt,
                                       String issuer, String audience) {
        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .issueTime(Date.from(issuedAt))
                .expirationTime(Date.from(expiresAt))
                .audience(List.of(audience))
                .jwtID(UUID.randomUUID().toString());
        if (sub != null) {
            builder.subject(sub);
        }
        if (scopes != null) {
            builder.claim("scope", scopes);
        }
        return builder.build();
    }

    private static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}