package com.grocery.microservices.summary.repository;

import com.grocery.microservices.summary.model.ProcessedOrderEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedOrderEventRepository extends JpaRepository<ProcessedOrderEvent, String> {
}