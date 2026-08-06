package com.payments.dto;

import com.payments.model.Payment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Payment view returned by the API. Carries the current error details (if the
 * payment has failed) as a convenience; the full per-transition record still lives
 * in the payment's status history.
 */
public record PaymentResponse(

        UUID id,
        BigDecimal amount,
        String currency,
        String destinationCurrency,
        BigDecimal exchangeRate,
        BigDecimal convertedAmount,
        String sourceAccount,
        String destinationAccount,
        String status,
        String description,
        String idempotencyKey,
        String errorCode,
        String errorMessage,
        LocalDateTime createdAt
) {

    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getDestinationCurrency(),
                payment.getExchangeRate(),
                payment.getConvertedAmount(),
                payment.getSourceAccount(),
                payment.getDestinationAccount(),
                payment.getStatus().name(),
                payment.getDescription(),
                payment.getIdempotencyKey(),
                payment.getErrorCode(),
                payment.getErrorMessage(),
                payment.getCreatedAt()
        );
    }
}

