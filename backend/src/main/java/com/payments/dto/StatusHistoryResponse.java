package com.payments.dto;

import com.payments.model.PaymentStatusHistory;

import java.time.LocalDateTime;

/**
 * One entry in a payment's audit trail. Field names deliberately match the
 * PaymentStatusHistory entity rather than renaming to fromStatus/note — one
 * vocabulary end to end. See CHALLENGES.md entry 4.
 */
public record StatusHistoryResponse(

        String oldStatus,
        String status,
        LocalDateTime timestamp,
        String reason,
        String errorCode,
        String errorMessage
) {

    public static StatusHistoryResponse from(PaymentStatusHistory history) {
        return new StatusHistoryResponse(
                history.getOldStatus() == null ? null : history.getOldStatus().name(),
                history.getStatus().name(),
                history.getTimestamp(),
                history.getReason(),
                history.getErrorCode(),
                history.getErrorMessage()
        );
    }
}
