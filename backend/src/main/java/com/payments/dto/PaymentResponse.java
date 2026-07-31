package com.payments.dto;

// TODO: Implement PaymentResponse DTO (record or class)
//
// Fields (mirrors Payment entity, all serialisable to JSON):
//   UUID           id
//   String         sourceAccount
//   String         destinationAccount
//   BigDecimal     amount
//   String         currency
//   String         status           (enum name as string)
//   String         reference
//   String         idempotencyKey
//   String         errorCode
//   String         errorMessage
//   LocalDateTime  createdAt
//   LocalDateTime  updatedAt
//
// Provide a static factory method or MapStruct mapper:
//   PaymentResponse from(Payment payment)
