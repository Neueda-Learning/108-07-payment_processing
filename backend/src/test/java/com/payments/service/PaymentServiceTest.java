package com.payments.service;

import com.payments.dto.PaymentRequest;
import com.payments.dto.PaymentResponse;
import com.payments.exception.DuplicatePaymentException;
import com.payments.exception.InvalidStatusTransitionException;
import com.payments.exception.PaymentNotFoundException;
import com.payments.exception.PaymentValidationException;
import com.payments.model.Account;
import com.payments.model.AccountType;
import com.payments.model.Payment;
import com.payments.model.PaymentStatus;
import com.payments.repository.AccountRepository;
import com.payments.repository.PaymentRepository;
import com.payments.repository.PaymentStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PaymentService}. Repositories are mocked; {@link ExchangeRateService}
 * is used as a real instance (it has no dependencies of its own) so conversion math is
 * exercised for real rather than stubbed.
 */
@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentStatusHistoryRepository historyRepository;

    @Mock
    private AccountRepository accountRepository;

    private final ExchangeRateService exchangeRateService = new ExchangeRateService();

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(paymentRepository, historyRepository, accountRepository,
                exchangeRateService);

        // save() on the payment repo: return whatever was passed in, assigning an id if missing,
        // same as JPA would on first insert. lenient: only tests that reach a successful save()
        // use this stub — most validation-failure tests never get there.
        lenient().when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            if (p.getId() == null) {
                p.setId(UUID.randomUUID());
            }
            return p;
        });
    }

    private Account account(String number, String owner, String currency, String balance) {
        Account account = new Account();
        account.setAccountNumber(number);
        account.setUsername(owner);
        account.setCurrency(currency);
        account.setBalance(new BigDecimal(balance));
        account.setAccountHolderName(owner + " Holder");
        account.setBankName("Test Bank");
        account.setAccountType(AccountType.SAVINGS);
        return account;
    }

    private PaymentRequest request(String amount, String currency, String source, String destination) {
        return new PaymentRequest(new BigDecimal(amount), currency, source, destination, "test payment", null);
    }

    private Payment existingPayment(PaymentStatus status, String source, String destination,
                                    String amount, String convertedAmount) {
        Payment payment = new Payment();
        payment.setId(UUID.randomUUID());
        payment.setStatus(status);
        payment.setSourceAccount(source);
        payment.setDestinationAccount(destination);
        payment.setAmount(new BigDecimal(amount));
        payment.setCurrency("USD");
        payment.setDestinationCurrency("USD");
        payment.setExchangeRate(BigDecimal.ONE);
        payment.setConvertedAmount(new BigDecimal(convertedAmount));
        return payment;
    }

    // ---- createPayment ----

    @Test
    void createPayment_sameCurrency_succeeds() {
        Account source = account("SRC001", "alice", "USD", "500.00");
        Account destination = account("DEST001", "bob", "USD", "100.00");
        when(accountRepository.findById("SRC001")).thenReturn(Optional.of(source));
        when(accountRepository.findById("DEST001")).thenReturn(Optional.of(destination));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));

        PaymentResponse response = paymentService.createPayment("alice",
                request("100.00", "USD", "SRC001", "DEST001"));

        assertThat(response.status()).isEqualTo("CREATED");
        assertThat(response.currency()).isEqualTo("USD");
        assertThat(response.destinationCurrency()).isEqualTo("USD");
        assertThat(response.exchangeRate()).isEqualByComparingTo(BigDecimal.ONE);
        assertThat(response.convertedAmount()).isEqualByComparingTo("100.00");

        ArgumentCaptor<Payment> savedPayment = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(savedPayment.capture());
        assertThat(savedPayment.getValue().getStatus()).isEqualTo(PaymentStatus.CREATED);
        verify(historyRepository).save(any());
    }

    @Test
    void createPayment_crossCurrency_convertsAmountAtLockedRate() {
        Account source = account("SRC001", "alice", "USD", "500.00");
        Account destination = account("DESTEUR", "bob", "EUR", "0.00");
        when(accountRepository.findById("SRC001")).thenReturn(Optional.of(source));
        when(accountRepository.findById("DESTEUR")).thenReturn(Optional.of(destination));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));

        PaymentResponse response = paymentService.createPayment("alice",
                request("100.00", "USD", "SRC001", "DESTEUR"));

        assertThat(response.destinationCurrency()).isEqualTo("EUR");
        assertThat(response.exchangeRate()).isEqualByComparingTo("0.920000");
        assertThat(response.convertedAmount()).isEqualByComparingTo("92.00");
    }

    @Test
    void createPayment_duplicateIdempotencyKey_throwsAndDoesNotSave() {
        when(paymentRepository.findByIdempotencyKey("dup-key"))
                .thenReturn(Optional.of(new Payment()));
        PaymentRequest req = new PaymentRequest(new BigDecimal("10.00"), "USD", "SRC001", "DEST001",
                "desc", "dup-key");

        assertThatThrownBy(() -> paymentService.createPayment("alice", req))
                .isInstanceOf(DuplicatePaymentException.class);

        verify(paymentRepository, never()).save(any());
    }

    @Test
    void createPayment_blankSourceAccount_throwsValidationException() {
        PaymentRequest req = request("10.00", "USD", "  ", "DEST001");

        assertThatThrownBy(() -> paymentService.createPayment("alice", req))
                .isInstanceOf(PaymentValidationException.class)
                .extracting(ex -> ((PaymentValidationException) ex).getErrorCode())
                .isEqualTo("INVALID_ACCOUNT");
    }

    @Test
    void createPayment_sourceEqualsDestination_throws() {
        PaymentRequest req = request("10.00", "USD", "SAME001", "same001");

        assertThatThrownBy(() -> paymentService.createPayment("alice", req))
                .isInstanceOf(PaymentValidationException.class)
                .hasMessageContaining("must be different");
    }

    @Test
    void createPayment_unsupportedCurrency_throws() {
        PaymentRequest req = request("10.00", "GBP", "SRC001", "DEST001");

        assertThatThrownBy(() -> paymentService.createPayment("alice", req))
                .isInstanceOf(PaymentValidationException.class)
                .extracting(ex -> ((PaymentValidationException) ex).getErrorCode())
                .isEqualTo("UNSUPPORTED_CURRENCY");
    }

    @Test
    void createPayment_notAValidIsoCurrency_throws() {
        PaymentRequest req = request("10.00", "ZZZ", "SRC001", "DEST001");

        assertThatThrownBy(() -> paymentService.createPayment("alice", req))
                .isInstanceOf(PaymentValidationException.class)
                .extracting(ex -> ((PaymentValidationException) ex).getErrorCode())
                .isEqualTo("INVALID_CURRENCY");
    }

    @Test
    void createPayment_sourceAccountDoesNotExist_throws() {
        when(accountRepository.findById("SRC001")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.createPayment("alice",
                request("10.00", "USD", "SRC001", "DEST001")))
                .isInstanceOf(PaymentValidationException.class)
                .extracting(ex -> ((PaymentValidationException) ex).getErrorCode())
                .isEqualTo("INVALID_ACCOUNT");
    }

    @Test
    void createPayment_sourceCurrencyMismatch_throws() {
        Account source = account("SRC001", "alice", "EUR", "500.00");
        when(accountRepository.findById("SRC001")).thenReturn(Optional.of(source));

        assertThatThrownBy(() -> paymentService.createPayment("alice",
                request("10.00", "USD", "SRC001", "DEST001")))
                .isInstanceOf(PaymentValidationException.class)
                .extracting(ex -> ((PaymentValidationException) ex).getErrorCode())
                .isEqualTo("INVALID_CURRENCY");
    }

    @Test
    void createPayment_sourceNotOwnedByCaller_throws() {
        Account source = account("SRC001", "someoneElse", "USD", "500.00");
        Account destination = account("DEST001", "bob", "USD", "0.00");
        when(accountRepository.findById("SRC001")).thenReturn(Optional.of(source));
        when(accountRepository.findById("DEST001")).thenReturn(Optional.of(destination));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of());

        assertThatThrownBy(() -> paymentService.createPayment("alice",
                request("10.00", "USD", "SRC001", "DEST001")))
                .isInstanceOf(PaymentValidationException.class)
                .extracting(ex -> ((PaymentValidationException) ex).getErrorCode())
                .isEqualTo("ACCOUNT_NOT_OWNED");
    }

    @Test
    void createPayment_amountOverCurrencyLimit_throws() {
        Account source = account("SRC001", "alice", "USD", "50000.00");
        Account destination = account("DEST001", "bob", "USD", "0.00");
        when(accountRepository.findById("SRC001")).thenReturn(Optional.of(source));
        when(accountRepository.findById("DEST001")).thenReturn(Optional.of(destination));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));

        assertThatThrownBy(() -> paymentService.createPayment("alice",
                request("15000.00", "USD", "SRC001", "DEST001")))
                .isInstanceOf(PaymentValidationException.class)
                .extracting(ex -> ((PaymentValidationException) ex).getErrorCode())
                .isEqualTo("AMOUNT_LIMIT_EXCEEDED");
    }

    // ---- advancePaymentStatus ----

    @Test
    void advance_createdToValidated_succeedsWhenFundsAvailable() {
        Payment payment = existingPayment(PaymentStatus.CREATED, "SRC001", "DEST001", "100.00", "100.00");
        Account source = account("SRC001", "alice", "USD", "500.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));
        when(accountRepository.findById("SRC001")).thenReturn(Optional.of(source));

        PaymentResponse response = paymentService.advancePaymentStatus("alice", payment.getId());

        assertThat(response.status()).isEqualTo("VALIDATED");
        verify(accountRepository, never()).save(any());
    }

    @Test
    void advance_createdToValidated_insufficientFunds_throws() {
        Payment payment = existingPayment(PaymentStatus.CREATED, "SRC001", "DEST001", "600.00", "600.00");
        Account source = account("SRC001", "alice", "USD", "100.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));
        when(accountRepository.findById("SRC001")).thenReturn(Optional.of(source));

        assertThatThrownBy(() -> paymentService.advancePaymentStatus("alice", payment.getId()))
                .isInstanceOf(PaymentValidationException.class)
                .extracting(ex -> ((PaymentValidationException) ex).getErrorCode())
                .isEqualTo("INSUFFICIENT_FUNDS");

        verify(paymentRepository, never()).save(any());
    }

    @Test
    void advance_validatedToSent_debitsSourceAccount() {
        Payment payment = existingPayment(PaymentStatus.VALIDATED, "SRC001", "DEST001", "100.00", "100.00");
        Account source = account("SRC001", "alice", "USD", "500.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));
        when(accountRepository.findById("SRC001")).thenReturn(Optional.of(source));

        PaymentResponse response = paymentService.advancePaymentStatus("alice", payment.getId());

        assertThat(response.status()).isEqualTo("SENT");
        ArgumentCaptor<Account> savedAccount = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository).save(savedAccount.capture());
        assertThat(savedAccount.getValue().getBalance()).isEqualByComparingTo("400.00");
    }

    @Test
    void advance_sentToCompleted_creditsDestinationAccountConvertedAmount() {
        Payment payment = existingPayment(PaymentStatus.SENT, "SRC001", "DESTEUR", "100.00", "92.00");
        Account destination = account("DESTEUR", "bob", "EUR", "10.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("bob")).thenReturn(List.of(destination));
        when(accountRepository.findById("DESTEUR")).thenReturn(Optional.of(destination));

        PaymentResponse response = paymentService.advancePaymentStatus("bob", payment.getId());

        assertThat(response.status()).isEqualTo("COMPLETED");
        ArgumentCaptor<Account> savedAccount = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository).save(savedAccount.capture());
        assertThat(savedAccount.getValue().getBalance()).isEqualByComparingTo("102.00");
    }

    @Test
    void advance_completedPayment_throwsInvalidStatusTransition() {
        Payment payment = existingPayment(PaymentStatus.COMPLETED, "SRC001", "DEST001", "100.00", "100.00");
        Account source = account("SRC001", "alice", "USD", "500.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));

        assertThatThrownBy(() -> paymentService.advancePaymentStatus("alice", payment.getId()))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }

    @Test
    void advance_unknownPaymentId_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(paymentRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.advancePaymentStatus("alice", id))
                .isInstanceOf(PaymentNotFoundException.class);
    }

    @Test
    void advance_paymentNotOwnedByCaller_throwsNotFound() {
        Payment payment = existingPayment(PaymentStatus.CREATED, "SRC001", "DEST001", "100.00", "100.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("mallory")).thenReturn(List.of());

        assertThatThrownBy(() -> paymentService.advancePaymentStatus("mallory", payment.getId()))
                .isInstanceOf(PaymentNotFoundException.class);
    }

    // ---- failPayment ----

    @Test
    void failPayment_fromCreated_usesDefaultErrorCodeAndDoesNotTouchAccounts() {
        Payment payment = existingPayment(PaymentStatus.CREATED, "SRC001", "DEST001", "100.00", "100.00");
        Account source = account("SRC001", "alice", "USD", "500.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));

        PaymentResponse response = paymentService.failPayment("alice", payment.getId(), null);

        assertThat(response.status()).isEqualTo("FAILED");
        assertThat(response.errorCode()).isEqualTo("PROCESSING_ERROR");
        verify(accountRepository, never()).save(any());
    }

    @Test
    void failPayment_withCustomErrorCode_isPersisted() {
        Payment payment = existingPayment(PaymentStatus.CREATED, "SRC001", "DEST001", "100.00", "100.00");
        Account source = account("SRC001", "alice", "USD", "500.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));

        PaymentResponse response = paymentService.failPayment("alice", payment.getId(), "GATEWAY_TIMEOUT");

        assertThat(response.errorCode()).isEqualTo("GATEWAY_TIMEOUT");
    }

    @Test
    void failPayment_fromSent_refundsSourceAccount() {
        Payment payment = existingPayment(PaymentStatus.SENT, "SRC001", "DEST001", "100.00", "100.00");
        Account source = account("SRC001", "alice", "USD", "400.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));
        when(accountRepository.findById("SRC001")).thenReturn(Optional.of(source));

        paymentService.failPayment("alice", payment.getId(), null);

        ArgumentCaptor<Account> savedAccount = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository).save(savedAccount.capture());
        assertThat(savedAccount.getValue().getBalance()).isEqualByComparingTo("500.00");
    }

    @Test
    void failPayment_alreadyCompleted_throwsInvalidStatusTransition() {
        Payment payment = existingPayment(PaymentStatus.COMPLETED, "SRC001", "DEST001", "100.00", "100.00");
        Account source = account("SRC001", "alice", "USD", "500.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));

        assertThatThrownBy(() -> paymentService.failPayment("alice", payment.getId(), null))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }

    @Test
    void failPayment_alreadyFailed_throwsInvalidStatusTransition() {
        Payment payment = existingPayment(PaymentStatus.FAILED, "SRC001", "DEST001", "100.00", "100.00");
        Account source = account("SRC001", "alice", "USD", "500.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));

        assertThatThrownBy(() -> paymentService.failPayment("alice", payment.getId(), null))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }

    // ---- getAllPayments / getStats ----

    @Test
    void getAllPayments_userWithNoAccounts_returnsEmptyWithoutQueryingPayments() {
        when(accountRepository.findByUsername("alice")).thenReturn(List.of());

        List<PaymentResponse> result = paymentService.getAllPayments("alice", null);

        assertThat(result).isEmpty();
        verify(paymentRepository, never()).findByAccountNumbers(any());
        verify(paymentRepository, never()).findByAccountNumbersAndStatus(any(), any());
    }

    @Test
    void getAllPayments_withStatusFilter_usesFilteredQuery() {
        Account source = account("SRC001", "alice", "USD", "500.00");
        Payment payment = existingPayment(PaymentStatus.COMPLETED, "SRC001", "DEST001", "100.00", "100.00");
        when(accountRepository.findByUsername("alice")).thenReturn(List.of(source));
        when(paymentRepository.findByAccountNumbersAndStatus(List.of("SRC001"), PaymentStatus.COMPLETED))
                .thenReturn(List.of(payment));

        List<PaymentResponse> result = paymentService.getAllPayments("alice", PaymentStatus.COMPLETED);

        assertThat(result).hasSize(1);
        verify(paymentRepository, never()).findByAccountNumbers(any());
    }

    @Test
    void getStats_userWithNoAccounts_returnsAllZero() {
        when(accountRepository.findByUsername("alice")).thenReturn(List.of());

        var stats = paymentService.getStats("alice");

        assertThat(stats.total()).isZero();
        assertThat(stats.completed()).isZero();
    }

    @Test
    void getPaymentById_notOwned_throwsNotFound() {
        Payment payment = existingPayment(PaymentStatus.CREATED, "SRC001", "DEST001", "100.00", "100.00");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(accountRepository.findByUsername("mallory")).thenReturn(List.of());

        assertThatThrownBy(() -> paymentService.getPaymentById("mallory", payment.getId()))
                .isInstanceOf(PaymentNotFoundException.class);
    }
}
