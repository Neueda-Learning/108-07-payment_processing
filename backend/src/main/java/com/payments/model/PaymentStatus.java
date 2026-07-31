package com.payments.model;

import com.payments.exception.InvalidStatusTransitionException;

public enum PaymentStatus {
    CREATED,
    VALIDATED,
    SENT,
    COMPLETED,
    FAILED;

    public PaymentStatus nextStatus() {
        return switch (this) {
            case CREATED   -> VALIDATED;
            case VALIDATED -> SENT;
            case SENT      -> COMPLETED;
            case COMPLETED -> throw new InvalidStatusTransitionException(this, null);
            case FAILED    -> throw new InvalidStatusTransitionException(this, null);
        };
    }
}
