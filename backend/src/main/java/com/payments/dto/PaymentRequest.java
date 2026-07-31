package com.payments.dto;

// TODO: Implement PaymentRequest DTO (record or class)
//
// Fields with Bean Validation:
//   @NotBlank  String sourceAccount
//   @NotBlank  String destinationAccount
//   @NotNull @Positive @DecimalMax("1000000") BigDecimal amount
//   @NotBlank @Size(min=3, max=3) String currency
//   String reference          (optional)
//   String idempotencyKey     (optional but recommended)
//
// Custom validation note:
//   sourceAccount must NOT equal destinationAccount
//   currency must be a valid ISO 4217 code
//   amount must have at most 2 decimal places
