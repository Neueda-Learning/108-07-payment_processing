package com.payments.dto;

import com.payments.model.Account;

import java.math.BigDecimal;

/** Account view returned by the API. */
public record AccountResponse(

        String accountNumber,
        String username,
        String currency,
        BigDecimal balance,
        String accountHolderName,
        String bankName,
        String accountType
) {

    public static AccountResponse from(Account account) {
        return new AccountResponse(
                account.getAccountNumber(),
                account.getUsername(),
                account.getCurrency(),
                account.getBalance(),
                account.getAccountHolderName(),
                account.getBankName(),
                account.getAccountType() == null ? null : account.getAccountType().name()
        );
    }
}
