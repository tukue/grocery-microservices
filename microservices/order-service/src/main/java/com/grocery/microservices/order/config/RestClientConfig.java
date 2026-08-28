package com.grocery.microservices.order.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestClientConfig {
    @Bean
    public RestTemplate restTemplate(
            @Value("${services.cart.connect-timeout-ms:2000}") int connectTimeoutMs,
            @Value("${services.cart.read-timeout-ms:3000}") int readTimeoutMs) {
        if (connectTimeoutMs <= 0 || connectTimeoutMs > 30_000) {
            throw new IllegalArgumentException("Cart connect timeout must be between 1 and 30000ms");
        }
        if (readTimeoutMs <= 0 || readTimeoutMs > 60_000) {
            throw new IllegalArgumentException("Cart read timeout must be between 1 and 60000ms");
        }
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);
        return new RestTemplate(requestFactory);
    }
}
