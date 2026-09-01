package com.grocery.microservices.order.eventstore;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;
import java.util.UUID;

public interface StoredOrderEventRepository extends JpaRepository<StoredOrderEvent, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<StoredOrderEvent> findTop100ByStatusOrderByCreatedAtAsc(StoredOrderEventStatus status);
}
