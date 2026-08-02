package com.grocery.microservices.cart.repository;

import com.grocery.microservices.cart.model.Cart;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {
    @Override
    @EntityGraph(attributePaths = "items")
    Optional<Cart> findById(Long id);
}
