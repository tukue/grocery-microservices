package com.grocery.microservices.summary.repository;

import com.grocery.microservices.summary.model.Summary;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SummaryRepository extends JpaRepository<Summary, Long> {
    java.util.List<Summary> findByUserId(String userId);
    long countByUserId(String userId);
} 