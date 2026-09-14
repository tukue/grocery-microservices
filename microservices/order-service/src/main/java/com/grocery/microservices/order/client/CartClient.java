package com.grocery.microservices.order.client;

public interface CartClient {
    CartSnapshot getCart(Long cartId, String authorizationHeader);

    void markCheckedOut(Long cartId, String authorizationHeader);

    void markOpen(Long cartId, String authorizationHeader);
}
