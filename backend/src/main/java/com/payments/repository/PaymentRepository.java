package com.payments.repository;

import com.payments.model.Payment;
import com.payments.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

	List<Payment> findByStatus(PaymentStatus status);

	Optional<Payment> findByIdempotencyKey(String idempotencyKey);

	long countByStatus(PaymentStatus status);

	/**
	 * Every payment touching at least one of the given account numbers, either as
	 * source or destination. Used to scope the payment list/stats to the
	 * authenticated user's own accounts instead of returning every payment in the
	 * system.
	 */
	@Query("SELECT p FROM Payment p WHERE p.sourceAccount IN :accountNumbers OR p.destinationAccount IN :accountNumbers")
	List<Payment> findByAccountNumbers(@Param("accountNumbers") List<String> accountNumbers);

	@Query("SELECT p FROM Payment p WHERE (p.sourceAccount IN :accountNumbers OR p.destinationAccount IN :accountNumbers) "
			+ "AND p.status = :status")
	List<Payment> findByAccountNumbersAndStatus(@Param("accountNumbers") List<String> accountNumbers,
			@Param("status") PaymentStatus status);
}
