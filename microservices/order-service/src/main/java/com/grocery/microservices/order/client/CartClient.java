package com.grocery.microservices.order.client;

public interface CartClient {
    CartSnapshot getCart(Long cartId, String authorizationHeader);
}
