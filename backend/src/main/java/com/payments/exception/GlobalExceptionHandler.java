package com.payments.exception;

// TODO: Implement GlobalExceptionHandler
//
// Annotate with @RestControllerAdvice
//
// Handle the following exceptions and return a consistent error response body:
//
//   {
//     "errorCode":  "PAYMENT_NOT_FOUND",
//     "message":    "Payment not found: <id>",
//     "timestamp":  "2024-01-01T10:00:00"
//   }
//
// Handlers:
//
//   @ExceptionHandler(PaymentNotFoundException.class)
//     → 404, errorCode = "PAYMENT_NOT_FOUND"
//
//   @ExceptionHandler(InvalidStatusTransitionException.class)
//     → 400, errorCode = "INVALID_STATUS_TRANSITION"
//
//   @ExceptionHandler(DuplicatePaymentException.class)
//     → 409, errorCode = "DUPLICATE_PAYMENT"
//
//   @ExceptionHandler(MethodArgumentNotValidException.class)
//     → 400, errorCode = "VALIDATION_FAILED"
//     Include field-level validation errors in the message
//
//   @ExceptionHandler(Exception.class)
//     → 500, errorCode = "PROCESSING_ERROR"
//     Log the exception; do NOT expose internal stack traces to clients
