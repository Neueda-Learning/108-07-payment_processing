package com.payments.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * MVP payment creation request. Account fields, reference and idempotencyKey are
 * deferred to increment 2 — see CHALLENGES.md entry 3.
 *
 * <p>Currency is checked for length here; the ISO 4217 membership check happens in
 * PaymentService, since Bean Validation cannot express it without a custom validator.
 */
public record PaymentRequest(

        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be greater than zero")
        @DecimalMax(value = "1000000.00", message = "Amount must not exceed 1,000,000")
        @Digits(integer = 7, fraction = 2, message = "Amount must have at most 2 decimal places")
        BigDecimal amount,

        @NotBlank(message = "Currency is required")
        @Size(min = 3, max = 3, message = "Currency must be a 3-letter ISO 4217 code")
        String currency
) {
}
