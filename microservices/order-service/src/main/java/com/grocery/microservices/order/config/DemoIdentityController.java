package com.grocery.microservices.order.config;

import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.text.ParseException;
import java.util.Map;

/**
 * Development-only endpoints for the embedded demo identity provider:
 * OpenID Connect discovery, JWKS and a demo login that mints RS256 access
 * tokens. These must never be activated beyond the {@code dev} profile.
 */
@RestController
@Profile("dev")
public class DemoIdentityController {

    private final DemoIdentityProvider provider;

    public DemoIdentityController(DemoIdentityProvider provider) {
        this.provider = provider;
    }

    @GetMapping(value = "/.well-known/openid-configuration", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> openIdConfiguration() {
        return ResponseEntity.ok(provider.buildDiscoveryDocument());
    }

    @GetMapping(value = "/.well-known/jwks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> jwks() throws ParseException {
        return ResponseEntity.ok(provider.buildPublicJwkSet());
    }

    @PostMapping(value = "/auth/login", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> login(@RequestBody LoginRequest request) {
        if (provider.acceptsCredentials(request.username(), request.password())) {
            return ResponseEntity.ok(Map.of(
                    "token", provider.mintAccessToken(),
                    "type", "Bearer"
            ));
        }
        return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
    }

    public record LoginRequest(String username, String password) {
    }
}