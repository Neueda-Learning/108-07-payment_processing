package com.payments.service;

import com.payments.dto.AccountLookupResponse;
import com.payments.dto.AccountRequest;
import com.payments.dto.AccountResponse;
import com.payments.exception.AccountValidationException;
import com.payments.exception.DuplicateAccountException;
import com.payments.model.Account;
import com.payments.model.AccountType;
import com.payments.repository.AccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Currency;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Account registration and lookup, scoped to the authenticated user. Mirrors
 * PaymentService: no HTTP concerns here, only business rules.
 */
@Service
public class AccountService {

    /**
     * A brand-new account starts empty: there is no deposit/top-up feature, so funds
     * only ever arrive via a payment. The seeded dummy accounts (see
     * {@code com.payments.config.DataSeeder}) exist precisely so a new account has
     * somewhere to receive its first test transfer from.
     */
    private static final BigDecimal STARTING_BALANCE = new BigDecimal("0.00");

    /** Below this many characters a name search matches too much of the table to be useful. */
    private static final int MIN_SEARCH_LENGTH = 2;

    /** Caps how many payees a single name search can return. */
    private static final int MAX_SEARCH_RESULTS = 20;

    private final AccountRepository accountRepository;

    public AccountService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Transactional
    public AccountResponse createAccount(String username, AccountRequest request) {
        String accountNumber = request.accountNumber().trim();
        if (accountRepository.existsById(accountNumber)) {
            throw new DuplicateAccountException(accountNumber);
        }

        Account account = new Account();
        account.setAccountNumber(accountNumber);
        account.setUsername(username);
        account.setCurrency(normaliseCurrency(request.currency()));
        account.setBalance(STARTING_BALANCE);
        account.setBankAccountNumber(accountNumber);
        account.setAccountHolderName(request.accountHolderName().trim());
        account.setBankName(request.bankName().trim());
        account.setAccountType(parseAccountType(request.accountType()));

        Account saved = accountRepository.save(account);
        return AccountResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAccountsForUser(String username) {
        return accountRepository.findByUsername(username).stream()
                .map(AccountResponse::from)
                .toList();
    }

    /**
     * Looks up potential payment destinations by account holder name, for the
     * "search for a payee" step of creating a payment. Matches across every user's
     * accounts (not just the caller's own) since a destination is typically someone
     * else — but returns only the public-safe fields (see {@link AccountLookupResponse}).
     *
     * <p>Blank or too-short input returns no results rather than erroring, since the
     * caller is typically still mid-keystroke; a short query would otherwise match a
     * large fraction of the table.
     */
    @Transactional(readOnly = true)
    public List<AccountLookupResponse> searchByAccountHolderName(String holderName) {
        String trimmed = holderName == null ? "" : holderName.trim();
        if (trimmed.length() < MIN_SEARCH_LENGTH) {
            return List.of();
        }

        return accountRepository.findByAccountHolderNameContainingIgnoreCase(trimmed).stream()
                .limit(MAX_SEARCH_RESULTS)
                .map(AccountLookupResponse::from)
                .toList();
    }

    /**
     * Resolves a single known account number to its public-safe details — used to
     * redisplay the account holder name for a destination that was already chosen
     * (e.g. re-populating the form when retrying a failed payment), without a fresh
     * name search. Empty if no such account exists.
     */
    @Transactional(readOnly = true)
    public Optional<AccountLookupResponse> getByAccountNumber(String accountNumber) {
        return accountRepository.findById(accountNumber).map(AccountLookupResponse::from);
    }

    private AccountType parseAccountType(String accountType) {
        try {
            return AccountType.valueOf(accountType.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new AccountValidationException("INVALID_ACCOUNT_TYPE",
                    "Account type must be one of SAVINGS, CURRENT, SALARY");
        }
    }

    /** Same ISO 4217 check PaymentService applies to payment currencies. */
    private String normaliseCurrency(String currency) {
        String code = currency.trim().toUpperCase(Locale.ROOT);
        try {
            Currency.getInstance(code);
        } catch (IllegalArgumentException ex) {
            throw new AccountValidationException("INVALID_CURRENCY",
                    "Currency is not a valid ISO 4217 code: " + currency);
        }
        return code;
    }
}
