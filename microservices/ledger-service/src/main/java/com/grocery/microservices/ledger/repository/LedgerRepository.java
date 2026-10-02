package com.grocery.microservices.ledger.repository;

import com.grocery.microservices.ledger.model.Ledger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LedgerRepository extends JpaRepository<Ledger, Long> {
    Optional<Ledger> findByOrderId(Long orderId);

    Optional<Ledger> findByOrderIdAndUserId(Long orderId, String userId);

    List<Ledger> findByUserIdOrderByCreatedAtDesc(String userId);

    long countByUserId(String userId);
}
