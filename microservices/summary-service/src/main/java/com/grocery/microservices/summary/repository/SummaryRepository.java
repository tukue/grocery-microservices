package com.grocery.microservices.summary.repository;

import com.grocery.microservices.summary.model.Summary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SummaryRepository extends JpaRepository<Summary, Long> {
    Optional<Summary> findByOrderId(Long orderId);

    Optional<Summary> findByOrderIdAndUserId(Long orderId, String userId);

    List<Summary> findByUserIdOrderByCreatedAtDesc(String userId);

    long countByUserId(String userId);
}