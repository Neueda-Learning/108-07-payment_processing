package com.payments.controller;

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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
}
