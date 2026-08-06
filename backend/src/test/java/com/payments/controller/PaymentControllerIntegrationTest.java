package com.payments.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end tests for {@code /api/payments/**}: real JWTs, real security filter
 * chain, real balance movements, H2 in place of MySQL.
 *
 * <p>Uses the demo {@code dummy_bank} user seeded by {@code DataSeeder} (funded
 * account {@code 900000000001}, USD) as a payment source, since brand-new accounts
 * always start at a zero balance and there is no deposit feature.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PaymentControllerIntegrationTest {

    private static final String DUMMY_USERNAME = "dummy_bank";
    private static final String DUMMY_PASSWORD = "Dummy@12345";
    private static final String DUMMY_USD_ACCOUNT = "900000000001";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String uniqueUsername(String prefix) {
        return prefix + "_" + System.nanoTime();
    }

    private String uniqueAccountNumber() {
        return String.valueOf(System.nanoTime()).substring(0, 12);
    }

    private record Registration(String username, String password) {
    }

    private record AccountPayload(String accountNumber, String currency, String accountHolderName,
                                  String bankName, String accountType) {
    }

    private record PaymentPayload(String amount, String currency, String sourceAccount,
                                  String destinationAccount, String description, String idempotencyKey) {
    }

    private String registerAndGetToken(String username) throws Exception {
        String body = objectMapper.writeValueAsString(new Registration(username, "password123"));
        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json").content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        String body = objectMapper.writeValueAsString(new Registration(username, password));
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json").content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    private void createAccount(String token, String accountNumber, String currency, String holderName)
            throws Exception {
        String body = objectMapper.writeValueAsString(
                new AccountPayload(accountNumber, currency, holderName, "Test Bank", "SAVINGS"));
        mockMvc.perform(post("/api/accounts").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(body))
                .andExpect(status().isCreated());
    }

    /** Reads the caller's own balance for one of their accounts via GET /api/accounts. */
    private BigDecimal getBalance(String token, String accountNumber) throws Exception {
        String response = mockMvc.perform(get("/api/accounts").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        for (JsonNode node : objectMapper.readTree(response)) {
            if (node.get("accountNumber").asText().equals(accountNumber)) {
                return new BigDecimal(node.get("balance").asText());
            }
        }
        throw new AssertionError("Account not found in caller's account list: " + accountNumber);
    }

    private String createPayment(String token, String amount, String currency, String source,
                                 String destination, String idempotencyKey) throws Exception {
        String body = objectMapper.writeValueAsString(
                new PaymentPayload(amount, currency, source, destination, "integration test", idempotencyKey));
        String response = mockMvc.perform(post("/api/payments").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    private void advance(String token, String paymentId, String expectedNewStatus) throws Exception {
        mockMvc.perform(post("/api/payments/" + paymentId + "/process")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(expectedNewStatus));
    }

    @Test
    void createPayment_withoutToken_returns401() throws Exception {
        String body = objectMapper.writeValueAsString(
                new PaymentPayload("10.00", "USD", DUMMY_USD_ACCOUNT, "999999999999", null, null));

        mockMvc.perform(post("/api/payments").contentType("application/json").content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createPayment_sourceNotOwnedByCaller_returns400() throws Exception {
        String targetToken = registerAndGetToken(uniqueUsername("notowner"));
        String targetAccount = uniqueAccountNumber();
        createAccount(targetToken, targetAccount, "USD", "Not Owner Holder");

        // Caller tries to source funds from the dummy bank's account, which they don't own.
        String body = objectMapper.writeValueAsString(
                new PaymentPayload("10.00", "USD", DUMMY_USD_ACCOUNT, targetAccount, null, null));

        mockMvc.perform(post("/api/payments").header("Authorization", "Bearer " + targetToken)
                        .contentType("application/json").content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("ACCOUNT_NOT_OWNED"));
    }

    @Test
    void createPayment_amountOverCurrencyLimit_returns400() throws Exception {
        String dummyToken = loginAndGetToken(DUMMY_USERNAME, DUMMY_PASSWORD);
        String targetToken = registerAndGetToken(uniqueUsername("overlimit"));
        String targetAccount = uniqueAccountNumber();
        createAccount(targetToken, targetAccount, "USD", "Over Limit Holder");

        String body = objectMapper.writeValueAsString(
                new PaymentPayload("15000.00", "USD", DUMMY_USD_ACCOUNT, targetAccount, null, null));

        mockMvc.perform(post("/api/payments").header("Authorization", "Bearer " + dummyToken)
                        .contentType("application/json").content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("AMOUNT_LIMIT_EXCEEDED"));
    }

    @Test
    void createPayment_duplicateIdempotencyKey_returns409() throws Exception {
        String dummyToken = loginAndGetToken(DUMMY_USERNAME, DUMMY_PASSWORD);
        String targetToken = registerAndGetToken(uniqueUsername("dupkey"));
        String targetAccount = uniqueAccountNumber();
        createAccount(targetToken, targetAccount, "USD", "Dup Key Holder");
        String key = "dup-key-" + System.nanoTime();

        String body = objectMapper.writeValueAsString(
                new PaymentPayload("5.00", "USD", DUMMY_USD_ACCOUNT, targetAccount, null, key));

        mockMvc.perform(post("/api/payments").header("Authorization", "Bearer " + dummyToken)
                        .contentType("application/json").content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/payments").header("Authorization", "Bearer " + dummyToken)
                        .contentType("application/json").content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_PAYMENT"));
    }

    @Test
    void fullLifecycle_completedPayment_movesBalancesAndRecordsHistory() throws Exception {
        String dummyToken = loginAndGetToken(DUMMY_USERNAME, DUMMY_PASSWORD);
        String targetUsername = uniqueUsername("recipient");
        String targetToken = registerAndGetToken(targetUsername);
        String targetAccount = uniqueAccountNumber();
        createAccount(targetToken, targetAccount, "USD", "Recipient Holder");

        BigDecimal dummyBalanceBefore = getBalance(dummyToken, DUMMY_USD_ACCOUNT);
        BigDecimal targetBalanceBefore = getBalance(targetToken, targetAccount);

        String paymentId = createPayment(dummyToken, "50.00", "USD", DUMMY_USD_ACCOUNT, targetAccount,
                "lifecycle-" + System.nanoTime());

        advance(dummyToken, paymentId, "VALIDATED");
        // Balance unaffected until SENT.
        assertThat(getBalance(dummyToken, DUMMY_USD_ACCOUNT)).isEqualByComparingTo(dummyBalanceBefore);

        advance(dummyToken, paymentId, "SENT");
        assertThat(getBalance(dummyToken, DUMMY_USD_ACCOUNT))
                .isEqualByComparingTo(dummyBalanceBefore.subtract(new BigDecimal("50.00")));

        advance(dummyToken, paymentId, "COMPLETED");
        assertThat(getBalance(targetToken, targetAccount))
                .isEqualByComparingTo(targetBalanceBefore.add(new BigDecimal("50.00")));

        // Both the source's and destination's owner can see the completed payment.
        mockMvc.perform(get("/api/payments/" + paymentId).header("Authorization", "Bearer " + dummyToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
        mockMvc.perform(get("/api/payments/" + paymentId).header("Authorization", "Bearer " + targetToken))
                .andExpect(status().isOk());

        // An unrelated third party gets a 404, not a 403 — existence isn't leaked.
        String strangerToken = registerAndGetToken(uniqueUsername("stranger"));
        mockMvc.perform(get("/api/payments/" + paymentId).header("Authorization", "Bearer " + strangerToken))
                .andExpect(status().isNotFound());

        // Full audit trail recorded in order.
        mockMvc.perform(get("/api/payments/" + paymentId + "/history")
                        .header("Authorization", "Bearer " + dummyToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].status").value("CREATED"))
                .andExpect(jsonPath("$[1].status").value("VALIDATED"))
                .andExpect(jsonPath("$[2].status").value("SENT"))
                .andExpect(jsonPath("$[3].status").value("COMPLETED"));
    }

    @Test
    void failPayment_afterSent_refundsSourceAccount() throws Exception {
        String dummyToken = loginAndGetToken(DUMMY_USERNAME, DUMMY_PASSWORD);
        String targetToken = registerAndGetToken(uniqueUsername("refundtest"));
        String targetAccount = uniqueAccountNumber();
        createAccount(targetToken, targetAccount, "USD", "Refund Test Holder");

        String paymentId = createPayment(dummyToken, "20.00", "USD", DUMMY_USD_ACCOUNT, targetAccount,
                "refund-" + System.nanoTime());
        advance(dummyToken, paymentId, "VALIDATED");
        advance(dummyToken, paymentId, "SENT");

        BigDecimal balanceAfterDebit = getBalance(dummyToken, DUMMY_USD_ACCOUNT);

        mockMvc.perform(post("/api/payments/" + paymentId + "/fail")
                        .header("Authorization", "Bearer " + dummyToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.errorCode").value("PROCESSING_ERROR"));

        assertThat(getBalance(dummyToken, DUMMY_USD_ACCOUNT))
                .isEqualByComparingTo(balanceAfterDebit.add(new BigDecimal("20.00")));

        // A completed/failed payment can never be advanced or failed again.
        mockMvc.perform(post("/api/payments/" + paymentId + "/process")
                        .header("Authorization", "Bearer " + dummyToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_STATUS_TRANSITION"));
    }

    @Test
    void advancePayment_insufficientFunds_returns400() throws Exception {
        String dummyToken = loginAndGetToken(DUMMY_USERNAME, DUMMY_PASSWORD);
        String targetToken = registerAndGetToken(uniqueUsername("insufficient"));
        String targetAccount = uniqueAccountNumber();
        createAccount(targetToken, targetAccount, "USD", "Insufficient Funds Holder");

        // Spend some of the dummy account down first, so "balance + 1" below is guaranteed
        // to still be under the per-transaction currency limit regardless of what other
        // tests in this class have already done to the (shared, seeded) dummy balance.
        String warmupId = createPayment(dummyToken, "100.00", "USD", DUMMY_USD_ACCOUNT, targetAccount,
                "warmup-" + System.nanoTime());
        advance(dummyToken, warmupId, "VALIDATED");
        advance(dummyToken, warmupId, "SENT");

        BigDecimal currentBalance = getBalance(dummyToken, DUMMY_USD_ACCOUNT);
        String tooMuch = currentBalance.add(BigDecimal.ONE).setScale(2, java.math.RoundingMode.HALF_UP).toString();

        String paymentId = createPayment(dummyToken, tooMuch, "USD", DUMMY_USD_ACCOUNT, targetAccount,
                "insufficient-" + System.nanoTime());

        mockMvc.perform(post("/api/payments/" + paymentId + "/process")
                        .header("Authorization", "Bearer " + dummyToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INSUFFICIENT_FUNDS"));
    }

    @Test
    void getStats_reflectsAtLeastTheCallersOwnPayments() throws Exception {
        String dummyToken = loginAndGetToken(DUMMY_USERNAME, DUMMY_PASSWORD);
        String targetToken = registerAndGetToken(uniqueUsername("stats"));
        String targetAccount = uniqueAccountNumber();
        createAccount(targetToken, targetAccount, "USD", "Stats Holder");

        createPayment(dummyToken, "1.00", "USD", DUMMY_USD_ACCOUNT, targetAccount, "stats-" + System.nanoTime());

        mockMvc.perform(get("/api/payments/stats").header("Authorization", "Bearer " + dummyToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
    }
}
