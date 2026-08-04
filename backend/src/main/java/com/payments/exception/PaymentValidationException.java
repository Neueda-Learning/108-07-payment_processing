package com.payments.exception;

public class PaymentValidationException extends RuntimeException {

    private final String errorCode;

    public PaymentValidationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
