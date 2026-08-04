package com.payments.dto;

import com.payments.model.Payment;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * MVP payment view. Failure details are not carried here — they belong to the
 * transition that caused them, so clients read them from the payment's status
 * history instead. See CHALLENGES.md entry 3.
 */
public record PaymentResponse(

        UUID id,
        BigDecimal amount,
        String currency,
        String status
) {

    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getStatus().name()
        );
    }
}
