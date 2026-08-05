package com.payments.exception;

public class AccountValidationException extends RuntimeException {

    private final String errorCode;

    public AccountValidationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
