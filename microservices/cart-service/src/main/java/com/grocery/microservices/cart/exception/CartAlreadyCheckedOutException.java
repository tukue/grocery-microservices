package com.grocery.microservices.cart.exception;

public class CartAlreadyCheckedOutException extends RuntimeException {
    public CartAlreadyCheckedOutException(Long cartId) {
        super("Cart " + cartId + " has already been checked out");
    }
}
