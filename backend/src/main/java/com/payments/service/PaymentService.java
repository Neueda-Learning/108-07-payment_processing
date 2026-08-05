package com.payments.service;

import com.payments.dto.PaymentRequest;
import com.payments.dto.PaymentResponse;
import com.payments.dto.PaymentStatsResponse;
import com.payments.dto.StatusHistoryResponse;
import com.payments.exception.DuplicatePaymentException;
import com.payments.exception.InvalidStatusTransitionException;
import com.payments.exception.PaymentNotFoundException;
import com.payments.exception.PaymentValidationException;
import com.payments.model.Account;
import com.payments.model.Payment;
import com.payments.model.PaymentStatus;
import com.payments.model.PaymentStatusHistory;
import com.payments.repository.AccountRepository;
import com.payments.repository.PaymentRepository;
import com.payments.repository.PaymentStatusHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * All payment business rules live here. The service owns validation, status
 * transitions and the audit trail; it knows nothing about HTTP.
 *
 * <p>Idempotency is enforced via a client-supplied {@code idempotencyKey}: a repeat
 * submission with a key that already exists is rejected as a duplicate rather than
 * silently creating a second payment.
 *
 * <p>Account balances move at specific lifecycle steps, not at creation: CREATED to
 * VALIDATED confirms funds are (still) available, VALIDATED to SENT is when the
 * source account is actually debited, and SENT to COMPLETED credits the destination.
 * A payment that fails after money has left the source (i.e. it was SENT) is
 * refunded back to the source as part of failing it.
 */
@Service
public class PaymentService {

    private static final String DEFAULT_FAILURE_CODE = "PROCESSING_ERROR";

    private final PaymentRepository paymentRepository;
    private final PaymentStatusHistoryRepository historyRepository;
    private final AccountRepository accountRepository;

    public PaymentService(PaymentRepository paymentRepository,
                          PaymentStatusHistoryRepository historyRepository,
                          AccountRepository accountRepository) {
        this.paymentRepository = paymentRepository;
        this.historyRepository = historyRepository;
        this.accountRepository = accountRepository;
    }

    @Transactional
    public PaymentResponse createPayment(PaymentRequest request) {
        String idempotencyKey = normaliseIdempotencyKey(request.idempotencyKey());
        if (idempotencyKey != null) {
            paymentRepository.findByIdempotencyKey(idempotencyKey).ifPresent(existing -> {
                throw new DuplicatePaymentException(idempotencyKey);
            });
        }

        String sourceAccount = requireAccount(request.sourceAccount(), "Source account");
        String destinationAccount = requireAccount(request.destinationAccount(), "Destination account");
        if (sourceAccount.equalsIgnoreCase(destinationAccount)) {
            throw new PaymentValidationException("INVALID_ACCOUNT",
                    "Source and destination accounts must be different");
        }

        String currency = normaliseCurrency(request.currency());
        ensureAccountUsable(sourceAccount, currency);
        ensureAccountUsable(destinationAccount, currency);

        Payment payment = new Payment();
        payment.setAmount(normaliseAmount(request.amount()));
        payment.setCurrency(currency);
        payment.setSourceAccount(sourceAccount);
        payment.setDestinationAccount(destinationAccount);
        payment.setDescription(request.description());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setStatus(PaymentStatus.CREATED);

        Payment saved = paymentRepository.save(payment);
        recordHistory(saved, null, PaymentStatus.CREATED, "Payment created", null, null);

        return PaymentResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getAllPayments(PaymentStatus status) {
        List<Payment> payments = (status == null)
                ? paymentRepository.findAll()
                : paymentRepository.findByStatus(status);

        return payments.stream().map(PaymentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(UUID id) {
        return PaymentResponse.from(findPaymentOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<StatusHistoryResponse> getPaymentHistory(UUID id) {
        // Look the payment up first so an unknown id gives 404 rather than an empty list.
        findPaymentOrThrow(id);

        return historyRepository.findByPaymentIdOrderByTimestampAsc(id).stream()
                .map(StatusHistoryResponse::from)
                .toList();
    }

    /**
     * Moves a payment one step along the happy path. The enum decides what "next"
     * means and refuses if the payment has already finished. Reaching VALIDATED or
     * SENT triggers the matching account side-effect (see class javadoc).
     */
    @Transactional
    public PaymentResponse advancePaymentStatus(UUID id) {
        Payment payment = findPaymentOrThrow(id);
        PaymentStatus current = payment.getStatus();
        PaymentStatus next = current.nextStatus();

        if (next == PaymentStatus.VALIDATED) {
            checkFundsAvailable(payment);
        } else if (next == PaymentStatus.SENT) {
            debitSourceAccount(payment);
        } else if (next == PaymentStatus.COMPLETED) {
            creditDestinationAccount(payment);
        }

        payment.setStatus(next);
        Payment saved = paymentRepository.save(payment);
        recordHistory(saved, current, next, "Advanced to " + next, null, null);

        return PaymentResponse.from(saved);
    }

    @Transactional
    public PaymentResponse failPayment(UUID id, String errorCode) {
        Payment payment = findPaymentOrThrow(id);
        PaymentStatus current = payment.getStatus();

        if (current == PaymentStatus.COMPLETED || current == PaymentStatus.FAILED) {
            throw new InvalidStatusTransitionException(current, PaymentStatus.FAILED);
        }

        // Money already left the source account once SENT, so failing from here on
        // must give it back.
        if (current == PaymentStatus.SENT) {
            refundSourceAccount(payment);
        }

        String code = (errorCode == null || errorCode.isBlank()) ? DEFAULT_FAILURE_CODE : errorCode;
        String message = "Payment failed while in status " + current;

        payment.setStatus(PaymentStatus.FAILED);
        payment.setErrorCode(code);
        payment.setErrorMessage(message);
        Payment saved = paymentRepository.save(payment);
        recordHistory(saved, current, PaymentStatus.FAILED, "Payment failed", code, message);

        return PaymentResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public PaymentStatsResponse getStats() {
        return new PaymentStatsResponse(
                paymentRepository.count(),
                paymentRepository.countByStatus(PaymentStatus.CREATED),
                paymentRepository.countByStatus(PaymentStatus.VALIDATED),
                paymentRepository.countByStatus(PaymentStatus.SENT),
                paymentRepository.countByStatus(PaymentStatus.COMPLETED),
                paymentRepository.countByStatus(PaymentStatus.FAILED)
        );
    }

    private Payment findPaymentOrThrow(UUID id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new PaymentNotFoundException(id));
    }

    /**
     * Writes one audit-trail row. The timestamp is set by the entity's
     * {@code @PrePersist}, so every entry is stamped the same way.
     */
    private void recordHistory(Payment payment,
                               PaymentStatus oldStatus,
                               PaymentStatus newStatus,
                               String reason,
                               String errorCode,
                               String errorMessage) {
        PaymentStatusHistory history = new PaymentStatusHistory();
        history.setPayment(payment);
        history.setOldStatus(oldStatus);
        history.setStatus(newStatus);
        history.setReason(reason);
        history.setErrorCode(errorCode);
        history.setErrorMessage(errorMessage);

        historyRepository.save(history);
    }

    /** Stores money at a fixed 2 decimal places so 1.5 and 1.50 are never different rows. */
    private BigDecimal normaliseAmount(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    /** Trims and validates an account number is non-blank; blank/whitespace-only is rejected. */
    private String requireAccount(String account, String fieldLabel) {
        if (account == null || account.isBlank()) {
            throw new PaymentValidationException("INVALID_ACCOUNT", fieldLabel + " is required");
        }
        return account.trim();
    }

    /** Idempotency key is optional; blank input is treated the same as absent. */
    private String normaliseIdempotencyKey(String idempotencyKey) {
        return (idempotencyKey == null || idempotencyKey.isBlank()) ? null : idempotencyKey.trim();
    }

    /** Confirms an account exists and its balance is held in the payment's currency. */
    private void ensureAccountUsable(String accountNumber, String paymentCurrency) {
        Account account = findAccountOrThrow(accountNumber);
        if (!account.getCurrency().equalsIgnoreCase(paymentCurrency)) {
            throw new PaymentValidationException("INVALID_CURRENCY",
                    "Account " + accountNumber + " is held in " + account.getCurrency()
                            + ", not " + paymentCurrency);
        }
    }

    /** Re-checked here (not just at creation) since the balance may have moved since. */
    private void checkFundsAvailable(Payment payment) {
        Account source = findAccountOrThrow(payment.getSourceAccount());
        if (source.getBalance().compareTo(payment.getAmount()) < 0) {
            throw new PaymentValidationException("INSUFFICIENT_FUNDS",
                    "Source account " + payment.getSourceAccount() + " has insufficient funds");
        }
    }

    private void debitSourceAccount(Payment payment) {
        Account source = findAccountOrThrow(payment.getSourceAccount());
        if (source.getBalance().compareTo(payment.getAmount()) < 0) {
            throw new PaymentValidationException("INSUFFICIENT_FUNDS",
                    "Source account " + payment.getSourceAccount() + " has insufficient funds");
        }
        source.setBalance(source.getBalance().subtract(payment.getAmount()));
        accountRepository.save(source);
    }

    private void creditDestinationAccount(Payment payment) {
        Account destination = findAccountOrThrow(payment.getDestinationAccount());
        destination.setBalance(destination.getBalance().add(payment.getAmount()));
        accountRepository.save(destination);
    }

    private void refundSourceAccount(Payment payment) {
        Account source = findAccountOrThrow(payment.getSourceAccount());
        source.setBalance(source.getBalance().add(payment.getAmount()));
        accountRepository.save(source);
    }

    private Account findAccountOrThrow(String accountNumber) {
        return accountRepository.findById(accountNumber)
                .orElseThrow(() -> new PaymentValidationException("INVALID_ACCOUNT",
                        "Account does not exist: " + accountNumber));
    }

    /**
     * Bean Validation checks the currency is three characters; only this can check
     * it is a real one. {@link Currency#getInstance(String)} is the JDK's own ISO
     * 4217 table, so there is no hand-maintained list to fall out of date.
     */
    private String normaliseCurrency(String currency) {
        String code = currency.trim().toUpperCase(Locale.ROOT);
        try {
            Currency.getInstance(code);
        } catch (IllegalArgumentException ex) {
            throw new PaymentValidationException("INVALID_CURRENCY",
                    "Currency is not a valid ISO 4217 code: " + currency);
        }
        return code;
    }
}
