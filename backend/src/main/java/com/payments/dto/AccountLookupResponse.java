package com.payments.dto;

import com.payments.model.Account;

/**
 * Public-safe view of an account, used when looking up a *destination* for a
 * payment (i.e. potentially someone else's account, not the caller's own).
 *
 * <p>Deliberately narrower than {@link AccountResponse}: it omits {@code username}
 * and {@code balance} so that searching for a payee by account holder name never
 * leaks another user's identity mapping or how much money they hold.
 */
public record AccountLookupResponse(
        String accountNumber,
        String accountHolderName,
        String currency,
        String bankName,
        String accountType
) {

    public static AccountLookupResponse from(Account account) {
        return new AccountLookupResponse(
                account.getAccountNumber(),
                account.getAccountHolderName(),
                account.getCurrency(),
                account.getBankName(),
                account.getAccountType() == null ? null : account.getAccountType().name()
        );
    }
}
