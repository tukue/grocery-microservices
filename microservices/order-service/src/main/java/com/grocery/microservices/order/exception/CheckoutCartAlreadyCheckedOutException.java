package com.grocery.microservices.order.exception;

public class CheckoutCartAlreadyCheckedOutException extends RuntimeException {
    public CheckoutCartAlreadyCheckedOutException(Long cartId) {
        super("Cart " + cartId + " has already been checked out");
    }
}
