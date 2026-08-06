package com.payments.service;

import com.payments.dto.AccountLookupResponse;
import com.payments.dto.AccountRequest;
import com.payments.dto.AccountResponse;
import com.payments.exception.AccountValidationException;
import com.payments.exception.DuplicateAccountException;
import com.payments.model.Account;
import com.payments.model.AccountType;
import com.payments.repository.AccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    private AccountService accountService;

    @BeforeEach
    void setUp() {
        accountService = new AccountService(accountRepository);
        // lenient: only the tests that actually reach a successful save() use this stub.
        lenient().when(accountRepository.save(any(Account.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Account account(String number, String owner, String currency) {
        Account account = new Account();
        account.setAccountNumber(number);
        account.setUsername(owner);
        account.setCurrency(currency);
        account.setBalance(new BigDecimal("0.00"));
        account.setAccountHolderName(owner + " Holder");
        account.setBankName("Test Bank");
        account.setAccountType(AccountType.SAVINGS);
        return account;
    }

    @Test
    void createAccount_success_startsAtZeroBalance() {
        AccountRequest request = new AccountRequest("123456", "USD", "Alice Holder", "Test Bank", "SAVINGS");
        when(accountRepository.existsById("123456")).thenReturn(false);

        AccountResponse response = accountService.createAccount("alice", request);

        assertThat(response.accountNumber()).isEqualTo("123456");
        assertThat(response.username()).isEqualTo("alice");
        assertThat(response.balance()).isEqualByComparingTo("0.00");
        assertThat(response.accountType()).isEqualTo("SAVINGS");

        ArgumentCaptor<Account> saved = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository).save(saved.capture());
        assertThat(saved.getValue().getUsername()).isEqualTo("alice");
    }

    @Test
    void createAccount_duplicateAccountNumber_throws() {
        AccountRequest request = new AccountRequest("123456", "USD", "Alice Holder", "Test Bank", "SAVINGS");
        when(accountRepository.existsById("123456")).thenReturn(true);

        assertThatThrownBy(() -> accountService.createAccount("alice", request))
                .isInstanceOf(DuplicateAccountException.class);
    }

    @Test
    void createAccount_invalidAccountType_throws() {
        AccountRequest request = new AccountRequest("123456", "USD", "Alice Holder", "Test Bank", "BOGUS");
        when(accountRepository.existsById("123456")).thenReturn(false);

        assertThatThrownBy(() -> accountService.createAccount("alice", request))
                .isInstanceOf(AccountValidationException.class)
                .extracting(ex -> ((AccountValidationException) ex).getErrorCode())
                .isEqualTo("INVALID_ACCOUNT_TYPE");
    }

    @Test
    void createAccount_invalidCurrency_throws() {
        AccountRequest request = new AccountRequest("123456", "ZZZ", "Alice Holder", "Test Bank", "SAVINGS");
        when(accountRepository.existsById("123456")).thenReturn(false);

        assertThatThrownBy(() -> accountService.createAccount("alice", request))
                .isInstanceOf(AccountValidationException.class)
                .extracting(ex -> ((AccountValidationException) ex).getErrorCode())
                .isEqualTo("INVALID_CURRENCY");
    }

    @Test
    void getAccountsForUser_mapsRepositoryResults() {
        when(accountRepository.findByUsername("alice"))
                .thenReturn(List.of(account("123456", "alice", "USD")));

        List<AccountResponse> result = accountService.getAccountsForUser("alice");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).accountNumber()).isEqualTo("123456");
    }

    @Test
    void searchByAccountHolderName_tooShortQuery_returnsEmptyWithoutQuerying() {
        List<AccountLookupResponse> result = accountService.searchByAccountHolderName("a");

        assertThat(result).isEmpty();
    }

    @Test
    void searchByAccountHolderName_blankQuery_returnsEmpty() {
        assertThat(accountService.searchByAccountHolderName(null)).isEmpty();
        assertThat(accountService.searchByAccountHolderName("   ")).isEmpty();
    }

    @Test
    void searchByAccountHolderName_validQuery_returnsPublicSafeResults() {
        when(accountRepository.findByAccountHolderNameContainingIgnoreCase("ali"))
                .thenReturn(List.of(account("123456", "alice", "USD")));

        List<AccountLookupResponse> result = accountService.searchByAccountHolderName("ali");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).accountNumber()).isEqualTo("123456");
    }

    @Test
    void searchByAccountHolderName_capsResultsAtTwenty() {
        List<Account> manyAccounts = java.util.stream.IntStream.range(0, 25)
                .mapToObj(i -> account("ACC" + i, "user" + i, "USD"))
                .toList();
        when(accountRepository.findByAccountHolderNameContainingIgnoreCase("holder"))
                .thenReturn(manyAccounts);

        List<AccountLookupResponse> result = accountService.searchByAccountHolderName("holder");

        assertThat(result).hasSize(20);
    }

    @Test
    void getByAccountNumber_found_returnsAccount() {
        when(accountRepository.findById("123456")).thenReturn(Optional.of(account("123456", "alice", "USD")));

        Optional<AccountLookupResponse> result = accountService.getByAccountNumber("123456");

        assertThat(result).isPresent();
        assertThat(result.get().accountNumber()).isEqualTo("123456");
    }

    @Test
    void getByAccountNumber_notFound_returnsEmpty() {
        when(accountRepository.findById("999999")).thenReturn(Optional.empty());

        assertThat(accountService.getByAccountNumber("999999")).isEmpty();
    }
}
