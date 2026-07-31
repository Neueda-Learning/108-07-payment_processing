package com.payments.service;

// TODO: Implement PaymentService
//
// Annotate with @Service and @Transactional where appropriate.
//
// Methods:
//
//   PaymentResponse createPayment(PaymentRequest request)
//     - Validate all fields (see Appendix C in README)
//     - Check idempotencyKey uniqueness; if duplicate, return existing payment
//     - Create Payment entity with status = CREATED
//     - Save PaymentStatusHistory entry (fromStatus = null, status = CREATED)
//     - Return mapped PaymentResponse
//
//   List<PaymentResponse> getAllPayments(PaymentStatus status)
//     - If status is null, return all; otherwise filter by status
//
//   PaymentResponse getPaymentById(UUID id)
//     - Throw PaymentNotFoundException if not found
//
//   List<StatusHistoryResponse> getPaymentHistory(UUID id)
//     - Throw PaymentNotFoundException if payment not found
//     - Return ordered list of history entries
//
//   PaymentResponse advancePaymentStatus(UUID id)
//     - Determine next status in flow (CREATED→VALIDATED→SENT→COMPLETED)
//     - Throw InvalidStatusTransitionException if already COMPLETED or FAILED
//     - Update payment status
//     - Save history entry
//     - Return updated PaymentResponse
//
//   PaymentResponse failPayment(UUID id, String errorCode)
//     - Throw InvalidStatusTransitionException if already COMPLETED or FAILED
//     - Set status = FAILED, errorCode
//     - Save history entry with errorCode
//     - Return updated PaymentResponse
//
//   PaymentStatsResponse getStats()
//     - Return total count and per-status counts
