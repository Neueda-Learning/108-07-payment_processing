package com.payments.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end tests for {@code /api/accounts/**}: real JWTs obtained via
 * {@code /api/auth/register}, real security filter chain, H2 in place of MySQL.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AccountControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String uniqueUsername(String prefix) {
        return prefix + "_" + System.nanoTime();
    }

    private String uniqueAccountNumber() {
        // Digits only, 6-34 chars, per AccountRequest's pattern.
        return String.valueOf(System.nanoTime()).substring(0, 12);
    }

    /** Registers a brand-new user and returns the bearer token issued for it. */
    private String registerAndGetToken(String username) throws Exception {
        String body = objectMapper.writeValueAsString(new Registration(username, "password123"));
        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    private record Registration(String username, String password) {
    }

    private record AccountPayload(String accountNumber, String currency, String accountHolderName,
                                  String bankName, String accountType) {
    }

    @Test
    void createAccount_withoutToken_returns401() throws Exception {
        String body = objectMapper.writeValueAsString(
                new AccountPayload(uniqueAccountNumber(), "USD", "Alice Holder", "Test Bank", "SAVINGS"));

        mockMvc.perform(post("/api/accounts").contentType("application/json").content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createAccount_success_startsAtZeroBalanceAndOwnedByCaller() throws Exception {
        String token = registerAndGetToken(uniqueUsername("alice"));
        String accountNumber = uniqueAccountNumber();
        String body = objectMapper.writeValueAsString(
                new AccountPayload(accountNumber, "USD", "Alice Holder", "Test Bank", "SAVINGS"));

        mockMvc.perform(post("/api/accounts")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accountNumber").value(accountNumber))
                .andExpect(jsonPath("$.balance").value(0.00))
                .andExpect(jsonPath("$.accountType").value("SAVINGS"));
    }

    @Test
    void createAccount_duplicateAccountNumber_returns409() throws Exception {
        String token = registerAndGetToken(uniqueUsername("bob"));
        String accountNumber = uniqueAccountNumber();
        String body = objectMapper.writeValueAsString(
                new AccountPayload(accountNumber, "USD", "Bob Holder", "Test Bank", "SAVINGS"));

        mockMvc.perform(post("/api/accounts").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/accounts").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("ACCOUNT_ALREADY_EXISTS"));
    }

    @Test
    void createAccount_invalidAccountType_returns400() throws Exception {
        String token = registerAndGetToken(uniqueUsername("erin"));
        String body = objectMapper.writeValueAsString(
                new AccountPayload(uniqueAccountNumber(), "USD", "Erin Holder", "Test Bank", "NOT_A_TYPE"));

        mockMvc.perform(post("/api/accounts").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_ACCOUNT_TYPE"));
    }

    @Test
    void listAccounts_isScopedToCaller() throws Exception {
        String tokenA = registerAndGetToken(uniqueUsername("carolA"));
        String tokenB = registerAndGetToken(uniqueUsername("carolB"));
        String accountNumber = uniqueAccountNumber();
        String body = objectMapper.writeValueAsString(
                new AccountPayload(accountNumber, "USD", "Carol A Holder", "Test Bank", "SAVINGS"));

        mockMvc.perform(post("/api/accounts").header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json").content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/accounts").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].accountNumber").value(accountNumber));

        mockMvc.perform(get("/api/accounts").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void searchAccounts_findsAnyUsersAccountByHolderName_withoutLeakingBalanceOrUsername() throws Exception {
        String token = registerAndGetToken(uniqueUsername("dave"));
        String accountNumber = uniqueAccountNumber();
        String uniqueHolderName = "SearchableHolder" + System.nanoTime();
        String body = objectMapper.writeValueAsString(
                new AccountPayload(accountNumber, "USD", uniqueHolderName, "Test Bank", "SAVINGS"));

        mockMvc.perform(post("/api/accounts").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/accounts/search").param("holderName", uniqueHolderName)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].accountNumber").value(accountNumber))
                .andExpect(jsonPath("$[0].username").doesNotExist())
                .andExpect(jsonPath("$[0].balance").doesNotExist());
    }

    @Test
    void getAccount_byNumber_notFound_returns404() throws Exception {
        String token = registerAndGetToken(uniqueUsername("frank"));

        mockMvc.perform(get("/api/accounts/000000000000").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }
}
