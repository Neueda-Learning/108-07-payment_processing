package com.payments.controller;

// TODO: Implement PaymentController (REST API)
//
// All routes are under /api/payments and require JWT authentication.
//
// Endpoints:
//
//   POST   /api/payments
//     - Create a new payment (status = CREATED)
//     - Request body: PaymentRequest DTO
//     - Response: 201 Created + PaymentResponse
//     - Handles idempotency key: if duplicate key exists, return existing payment (409 or 200)
//
//   GET    /api/payments
//     - List all payments
//     - Optional query param: ?status=CREATED|VALIDATED|SENT|COMPLETED|FAILED
//     - Response: 200 OK + List<PaymentResponse>
//
//   GET    /api/payments/stats
//     - Return count per status + total
//     - Response: 200 OK + PaymentStatsResponse DTO
//
//   GET    /api/payments/{id}
//     - Get a single payment by UUID
//     - Response: 200 OK + PaymentResponse
//     - 404 if not found
//
//   GET    /api/payments/{id}/history
//     - Get all status history entries for a payment (ordered by timestamp ASC)
//     - Response: 200 OK + List<StatusHistoryResponse>
//
//   POST   /api/payments/{id}/process
//     - Advance payment to the next status in the lifecycle
//       (CREATED → VALIDATED → SENT → COMPLETED)
//     - Response: 200 OK + updated PaymentResponse
//     - 400 if transition is invalid or payment is already COMPLETED/FAILED
//
//   POST   /api/payments/{id}/fail
//     - Mark payment as FAILED
//     - Request body: { "errorCode": "PROCESSING_ERROR" }
//     - Response: 200 OK + updated PaymentResponse
//     - 400 if payment is already COMPLETED or FAILED
