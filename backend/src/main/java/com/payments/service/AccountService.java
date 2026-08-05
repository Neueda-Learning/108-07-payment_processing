package com.payments.service;

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
