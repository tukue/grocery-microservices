package com.grocery.microservices.order.repository;

import com.grocery.microservices.order.model.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    @Override
    @EntityGraph(attributePaths = "productIds")
    Optional<Order> findById(Long id);
}
