package com.payments.repository;

import com.payments.model.Payment;
import com.payments.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

	List<Payment> findByStatus(PaymentStatus status);

	Optional<Payment> findByIdempotencyKey(String idempotencyKey);

	long countByStatus(PaymentStatus status);
}
