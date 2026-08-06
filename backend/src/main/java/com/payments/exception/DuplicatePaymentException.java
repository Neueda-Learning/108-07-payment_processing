package com.payments.exception;

public class DuplicatePaymentException extends RuntimeException {

    public DuplicatePaymentException(String idempotencyKey) {
        super("Duplicate payment for idempotency key: " + idempotencyKey);
    }
}
