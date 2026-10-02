package com.grocery.microservices.ledger.repository;

import com.grocery.microservices.ledger.model.ProcessedOrderEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedOrderEventRepository extends JpaRepository<ProcessedOrderEvent, String> {
}
