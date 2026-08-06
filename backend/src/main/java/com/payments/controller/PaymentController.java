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
import org.springframework.security.core.Authentication;
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
 *
 * <p>The owning username always comes from the authenticated principal (never a
 * request parameter), and every service call is scoped to it: a user only ever
 * creates, lists, or advances payments touching their own accounts.
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
               description = "Creates a payment in CREATED status and records the first audit-trail entry. "
                           + "The source account must belong to the authenticated user.")
    public ResponseEntity<PaymentResponse> createPayment(Authentication authentication,
                                                         @Valid @RequestBody PaymentRequest request) {
        PaymentResponse created = paymentService.createPayment(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    @Operation(summary = "List payments",
               description = "Returns the authenticated user's payments (as source or destination account), "
                           + "or only those in the given status.")
    public ResponseEntity<List<PaymentResponse>> listPayments(
            Authentication authentication,
            @RequestParam(required = false) PaymentStatus status) {
        return ResponseEntity.ok(paymentService.getAllPayments(authentication.getName(), status));
    }

    /**
     * Declared before {@code /{id}} for readability, though Spring does not rely on
     * source order — a literal path segment always beats a path variable, so "stats"
     * is never mistaken for a payment id.
     */
    @GetMapping("/stats")
    @Operation(summary = "Payment counts",
               description = "Total number of the authenticated user's payments plus a count for each status.")
    public ResponseEntity<PaymentStatsResponse> getStats(Authentication authentication) {
        return ResponseEntity.ok(paymentService.getStats(authentication.getName()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one payment",
               description = "404 if no payment has this id, or it belongs to another user.")
    public ResponseEntity<PaymentResponse> getPayment(Authentication authentication, @PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getPaymentById(authentication.getName(), id));
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get a payment's audit trail",
               description = "Every status change for this payment, oldest first.")
    public ResponseEntity<List<StatusHistoryResponse>> getPaymentHistory(Authentication authentication,
                                                                         @PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getPaymentHistory(authentication.getName(), id));
    }

    @PostMapping("/{id}/process")
    @Operation(summary = "Advance a payment",
               description = "Moves the payment one step along CREATED to VALIDATED to SENT to "
                           + "COMPLETED. 400 if it has already finished.")
    public ResponseEntity<PaymentResponse> processPayment(Authentication authentication, @PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.advancePaymentStatus(authentication.getName(), id));
    }

    @PostMapping("/{id}/fail")
    @Operation(summary = "Fail a payment",
               description = "Marks the payment FAILED and records the reason on its audit trail. "
                           + "400 if it has already finished.")
    public ResponseEntity<PaymentResponse> failPayment(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestBody(required = false) FailPaymentRequest request) {

        // Body is optional so that "just fail it" needs no payload at all.
        String errorCode = (request == null) ? null : request.errorCode();
        return ResponseEntity.ok(paymentService.failPayment(authentication.getName(), id, errorCode));
    }
}
