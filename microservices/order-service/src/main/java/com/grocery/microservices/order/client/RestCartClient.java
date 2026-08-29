package com.grocery.microservices.order.client;

import com.grocery.microservices.order.exception.CartServiceUnavailableException;
import com.grocery.microservices.order.exception.CartAccessDeniedException;
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
import java.net.URI;

@Component
public class RestCartClient implements CartClient {
    private final RestTemplate restTemplate;
    private final String cartServiceBaseUrl;

    public RestCartClient(RestTemplate restTemplate,
                          @Value("${services.cart.base-url:http://localhost:8082}") String cartServiceBaseUrl) {
        this.restTemplate = restTemplate;
        URI serviceUri = URI.create(cartServiceBaseUrl);
        if (serviceUri.getHost() == null || serviceUri.getUserInfo() != null
                || serviceUri.getQuery() != null || serviceUri.getFragment() != null
                || !("http".equals(serviceUri.getScheme()) || "https".equals(serviceUri.getScheme()))) {
            throw new IllegalArgumentException("Cart service base URL must be an HTTP(S) host URL");
        }
        this.cartServiceBaseUrl = serviceUri.toString();
    }

    @Override
    public CartSnapshot getCart(Long cartId, String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new CartAccessDeniedException();
        }
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
        } catch (HttpClientErrorException.Forbidden | HttpClientErrorException.Unauthorized ex) {
            throw new CartAccessDeniedException();
        } catch (RestClientException ex) {
            throw new CartServiceUnavailableException();
        }
    }
}
