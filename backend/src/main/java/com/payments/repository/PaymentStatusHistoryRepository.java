package com.payments.repository;

import com.payments.model.PaymentStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PaymentStatusHistoryRepository extends JpaRepository<PaymentStatusHistory, Long> {

	List<PaymentStatusHistory> findByPaymentIdOrderByTimestampAsc(UUID paymentId);
}
