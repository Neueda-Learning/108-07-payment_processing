package com.payments.exception;

// TODO: Implement InvalidStatusTransitionException
//
// Extends: RuntimeException
//
// Constructor:
//   InvalidStatusTransitionException(PaymentStatus from, PaymentStatus to) {
//     super("Cannot transition from " + from + " to " + to);
//   }
//
// Used by GlobalExceptionHandler to return HTTP 400 with
// errorCode = "INVALID_STATUS_TRANSITION"
