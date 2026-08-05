package com.payments.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Payment creation request.
 *
 * <p>Currency is checked for length here; the ISO 4217 membership check happens in
 * PaymentService, since Bean Validation cannot express it without a custom validator.
 * The source/destination-account-must-differ rule is likewise a service-level check
 * since it spans two fields.
 */
public record PaymentRequest(

        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be greater than zero")
        @DecimalMax(value = "1000000.00", message = "Amount must not exceed 1,000,000")
        @Digits(integer = 7, fraction = 2, message = "Amount must have at most 2 decimal places")
        BigDecimal amount,

        @NotBlank(message = "Currency is required")
        @Size(min = 3, max = 3, message = "Currency must be a 3-letter ISO 4217 code")
        String currency,

        @NotBlank(message = "Source account is required")
        @Size(max = 34, message = "Source account must be at most 34 characters")
        String sourceAccount,

        @NotBlank(message = "Destination account is required")
        @Size(max = 34, message = "Destination account must be at most 34 characters")
        String destinationAccount,

        @Size(max = 255, message = "Description must be at most 255 characters")
        String description,

        @Size(max = 100, message = "Idempotency key must be at most 100 characters")
        String idempotencyKey
) {
}

