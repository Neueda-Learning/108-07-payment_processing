package com.payments.controller;

import com.payments.dto.AccountLookupResponse;
import com.payments.dto.AccountRequest;
import com.payments.dto.AccountResponse;
import com.payments.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The accounts API. Every route requires a valid JWT — see SecurityConfig. The
 * owning username always comes from the authenticated principal, never from the
 * request body, so one user can never list or create accounts for another.
 */
@RestController
@RequestMapping("/api/accounts")
@Tag(name = "Accounts", description = "Register and list a user's bank accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    @Operation(summary = "Register a bank account",
               description = "Creates a bank account owned by the authenticated user, seeded with a demo balance.")
    public ResponseEntity<AccountResponse> createAccount(Authentication authentication,
                                                         @Valid @RequestBody AccountRequest request) {
        AccountResponse created = accountService.createAccount(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    @Operation(summary = "List the authenticated user's bank accounts")
    public ResponseEntity<List<AccountResponse>> listAccounts(Authentication authentication) {
        return ResponseEntity.ok(accountService.getAccountsForUser(authentication.getName()));
    }

    /**
     * Declared before {@code /{accountNumber}}-style routes would be for the same
     * reason as {@code PaymentController#getStats}: a literal path segment always
     * wins over a path variable, so this is never mistaken for a lookup.
     */
    @GetMapping("/search")
    @Operation(summary = "Search for a payment destination by account holder name",
               description = "Case-insensitive partial match across every user's accounts, so a payment can be "
                           + "sent to someone else's account. Returns only public-safe fields (no balance or "
                           + "username). Queries shorter than 2 characters return no results.")
    public ResponseEntity<List<AccountLookupResponse>> searchAccounts(
            @RequestParam(required = false, defaultValue = "") String holderName) {
        return ResponseEntity.ok(accountService.searchByAccountHolderName(holderName));
    }

    @GetMapping("/{accountNumber}")
    @Operation(summary = "Look up a single account's public details by account number",
               description = "Used to redisplay an already-chosen destination's holder name (e.g. retrying a "
                           + "failed payment) without a fresh name search. 404 if no such account exists.")
    public ResponseEntity<AccountLookupResponse> getAccount(@PathVariable String accountNumber) {
        return accountService.getByAccountNumber(accountNumber)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
