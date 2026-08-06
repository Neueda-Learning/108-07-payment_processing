package com.payments.dto;

public record AuthResponse(String token, String tokenType) {

    private static final String BEARER = "Bearer";

    public static AuthResponse bearer(String token) {
        return new AuthResponse(token, BEARER);
    }
}
