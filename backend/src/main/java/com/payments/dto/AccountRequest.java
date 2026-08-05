package com.payments.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for registering a new bank account for the authenticated user.
 *
 * <p>{@code accountNumber} becomes the account's primary key, so it doubles as the
 * value clients later use as a payment's {@code sourceAccount}/{@code destinationAccount}.
 * {@code username} and {@code balance} are never accepted from the client: the owner
 * comes from the authenticated principal and the starting balance is fixed by the
 * service (see {@code AccountService}).
 */
public record AccountRequest(

        @NotBlank(message = "Account number is required")
        @Pattern(regexp = "\\d{6,34}", message = "Account number must be 6-34 digits with no spaces")
        String accountNumber,

        @NotBlank(message = "Currency is required")
        @Size(min = 3, max = 3, message = "Currency must be a 3-letter ISO 4217 code")
        String currency,

        @NotBlank(message = "Account holder name is required")
        @Size(max = 100, message = "Account holder name must be at most 100 characters")
        String accountHolderName,

        @NotBlank(message = "Bank name is required")
        @Size(max = 100, message = "Bank name must be at most 100 characters")
        String bankName,

        @NotBlank(message = "Account type is required")
        String accountType
) {
}
