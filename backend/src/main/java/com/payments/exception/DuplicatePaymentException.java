package com.payments.exception;

// TODO: Implement DuplicatePaymentException
//
// Extends: RuntimeException
//
// Constructor:
//   DuplicatePaymentException(String idempotencyKey) {
//     super("Duplicate payment for idempotency key: " + idempotencyKey);
//   }
//
// Used by GlobalExceptionHandler to return HTTP 409 with
// errorCode = "DUPLICATE_PAYMENT"
