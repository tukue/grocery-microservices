package com.grocery.microservices.order.client;

import com.grocery.microservices.order.exception.CartServiceUnavailableException;
import com.grocery.microservices.order.exception.CheckoutCartNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
public class RestCartClient implements CartClient {
    private final RestTemplate restTemplate;
    private final String cartServiceBaseUrl;

    public RestCartClient(RestTemplate restTemplate,
                          @Value("${services.cart.base-url:http://localhost:8082}") String cartServiceBaseUrl) {
        this.restTemplate = restTemplate;
        this.cartServiceBaseUrl = cartServiceBaseUrl;
    }

    @Override
    public CartSnapshot getCart(Long cartId, String authorizationHeader) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader);
        try {
            ResponseEntity<CartSnapshot> response = restTemplate.exchange(
                    cartServiceBaseUrl + "/carts/{cartId}",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    CartSnapshot.class,
                    cartId);
            if (response.getBody() == null) {
                throw new CartServiceUnavailableException();
            }
            return response.getBody();
        } catch (HttpClientErrorException.NotFound ex) {
            throw new CheckoutCartNotFoundException(cartId);
        } catch (RestClientException ex) {
            throw new CartServiceUnavailableException();
        }
    }
}
