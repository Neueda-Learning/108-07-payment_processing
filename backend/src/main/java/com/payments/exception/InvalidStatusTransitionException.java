package com.payments.exception;

import com.payments.model.PaymentStatus;

public class InvalidStatusTransitionException extends RuntimeException {

    public InvalidStatusTransitionException(PaymentStatus from, PaymentStatus to) {
        super("Cannot transition from " + from + " to " + to);
    }
}
