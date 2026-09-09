package com.grocery.microservices.cart.controller;

import com.grocery.microservices.cart.config.TestJwtSupport;
import com.grocery.microservices.cart.config.TestSecurityConfig;
import com.grocery.microservices.cart.service.CartService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.stream.Stream;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Proves that the resource server performs real asymmetric JWT validation: an
 * invalid or inappropriate token is rejected with 401 before reaching the
 * controller.
 */
@ActiveProfiles("test")
@WebMvcTest(CartController.class)
@Import(TestSecurityConfig.class)
public class SecurityMatrixTest {

    @MockBean
    private CartService cartService;

    @Autowired
    private MockMvc mockMvc;

    public static Stream<Arguments> invalidTokens() {
        return Stream.of(
                Arguments.of("missing token", ""),
                Arguments.of("expired token", TestJwtSupport.expiredToken("customer-1")),
                Arguments.of("invalid signature", TestJwtSupport.tokenSignedWithDifferentKey("customer-1")),
                Arguments.of("wrong issuer", TestJwtSupport.tokenSignedWithWrongIssuer("customer-1")),
                Arguments.of("wrong audience", TestJwtSupport.tokenSignedForWrongAudience("customer-1")),
                Arguments.of("missing sub", TestJwtSupport.tokenWithoutSubject())
        );
    }

    @ParameterizedTest(name = "{0} is rejected with 401")
    @MethodSource("invalidTokens")
    public void rejectsInvalidOrInsufficientTokens(String scenario, String token) throws Exception {
        mockMvc.perform(get("/api/customer/cart")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}