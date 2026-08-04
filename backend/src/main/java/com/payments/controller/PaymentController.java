package com.payments.controller;

import com.payments.dto.FailPaymentRequest;
import com.payments.dto.PaymentRequest;
import com.payments.dto.PaymentResponse;
import com.payments.dto.PaymentStatsResponse;
import com.payments.dto.StatusHistoryResponse;
import com.payments.model.PaymentStatus;
import com.payments.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * The payment API. Every route requires a valid JWT — see SecurityConfig.
 *
 * <p>Deliberately thin: each method converts an HTTP request into a service call and
 * a status code, and nothing else. No business rules live here. Errors are not caught
 * either; the service throws and GlobalExceptionHandler translates.
 */
@RestController
@RequestMapping("/api/payments")
@Tag(name = "Payments", description = "Create payments and move them through their lifecycle")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    @Operation(summary = "Create a payment",
               description = "Creates a payment in CREATED status and records the first audit-trail entry.")
    public ResponseEntity<PaymentResponse> createPayment(@Valid @RequestBody PaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.createPayment(request));
    }

    @GetMapping
    @Operation(summary = "List payments",
               description = "Returns every payment, or only those in the given status.")
    public ResponseEntity<List<PaymentResponse>> listPayments(
            @RequestParam(required = false) PaymentStatus status) {
        return ResponseEntity.ok(paymentService.getAllPayments(status));
    }

    /**
     * Declared before {@code /{id}} for readability, though Spring does not rely on
     * source order — a literal path segment always beats a path variable, so "stats"
     * is never mistaken for a payment id.
     */
    @GetMapping("/stats")
    @Operation(summary = "Payment counts",
               description = "Total number of payments plus a count for each status.")
    public ResponseEntity<PaymentStatsResponse> getStats() {
        return ResponseEntity.ok(paymentService.getStats());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one payment", description = "404 if no payment has this id.")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get a payment's audit trail",
               description = "Every status change for this payment, oldest first.")
    public ResponseEntity<List<StatusHistoryResponse>> getPaymentHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getPaymentHistory(id));
    }

    @PostMapping("/{id}/process")
    @Operation(summary = "Advance a payment",
               description = "Moves the payment one step along CREATED to VALIDATED to SENT to "
                           + "COMPLETED. 400 if it has already finished.")
    public ResponseEntity<PaymentResponse> processPayment(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.advancePaymentStatus(id));
    }

    @PostMapping("/{id}/fail")
    @Operation(summary = "Fail a payment",
               description = "Marks the payment FAILED and records the reason on its audit trail. "
                           + "400 if it has already finished.")
    public ResponseEntity<PaymentResponse> failPayment(
            @PathVariable UUID id,
            @RequestBody(required = false) FailPaymentRequest request) {

        // Body is optional so that "just fail it" needs no payload at all.
        String errorCode = (request == null) ? null : request.errorCode();
        return ResponseEntity.ok(paymentService.failPayment(id, errorCode));
    }
}
