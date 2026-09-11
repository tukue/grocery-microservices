package com.grocery.microservices.order.client;

import com.grocery.microservices.order.exception.ProductServiceUnavailableException;
import com.grocery.microservices.order.exception.ProductUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;

@Component
public class RestProductClient implements ProductClient {
    private final RestTemplate restTemplate;
    private final String productServiceBaseUrl;

    public RestProductClient(RestTemplate restTemplate,
                             @Value("${services.product.base-url:http://product-service:8080}") String productServiceBaseUrl) {
        this.restTemplate = restTemplate;
        URI serviceUri = URI.create(productServiceBaseUrl);
        if (serviceUri.getHost() == null || serviceUri.getUserInfo() != null
                || serviceUri.getQuery() != null || serviceUri.getFragment() != null
                || !("http".equals(serviceUri.getScheme()) || "https".equals(serviceUri.getScheme()))) {
            throw new IllegalArgumentException("Product service base URL must be an HTTP(S) host URL");
        }
        this.productServiceBaseUrl = serviceUri.toString();
    }

    @Override
    public ProductSnapshot getProduct(Long productId) {
        try {
            ProductSnapshot product = restTemplate.getForObject(
                    productServiceBaseUrl + "/products/{productId}", ProductSnapshot.class, productId);
            if (product == null || !productId.equals(product.id()) || product.name() == null
                    || product.name().isBlank() || product.price() <= 0 || product.stockQuantity() < 0) {
                throw new ProductServiceUnavailableException();
            }
            return product;
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ProductUnavailableException(productId);
        } catch (RestClientException ex) {
            throw new ProductServiceUnavailableException();
        }
    }
}