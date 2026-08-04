package com.payments.dto;

import java.time.LocalDateTime;

/**
 * The single error shape every failing request returns, whatever went wrong.
 *
 * <p>{@code errorCode} is the machine-readable half — clients branch on it without
 * string-matching an English message that might later be reworded.
 */
public record ErrorResponse(

        String errorCode,
        String message,
        LocalDateTime timestamp
) {

    public static ErrorResponse of(String errorCode, String message) {
        return new ErrorResponse(errorCode, message, LocalDateTime.now());
    }
}
