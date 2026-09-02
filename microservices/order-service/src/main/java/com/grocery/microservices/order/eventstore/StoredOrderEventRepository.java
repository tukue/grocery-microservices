package com.grocery.microservices.order.eventstore;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface StoredOrderEventRepository extends JpaRepository<StoredOrderEvent, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select event from StoredOrderEvent event
            where (event.status = :pending and event.nextAttemptAt <= :now)
               or (event.status = :processing and event.leaseUntil <= :now)
            order by event.createdAt
            """)
    List<StoredOrderEvent> findProcessableEvents(
            @Param("pending") StoredOrderEventStatus pending,
            @Param("processing") StoredOrderEventStatus processing,
            @Param("now") Instant now,
            Pageable pageable);
}
