package com.payments.dto;

/**
 * Body for {@code POST /api/payments/{id}/fail}.
 *
 * <p>{@code errorCode} is optional: the service falls back to PROCESSING_ERROR when it
 * is absent or blank, so a caller who only knows "this failed" does not have to invent
 * a code. Appendix B lists the ones worth using.
 */
public record FailPaymentRequest(String errorCode) {
}
