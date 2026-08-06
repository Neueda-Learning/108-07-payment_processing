package com.payments.config;

import com.payments.model.Account;
import com.payments.model.AccountType;
import com.payments.model.User;
import com.payments.repository.AccountRepository;
import com.payments.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Seeds a demo "bank" user with 4 funded accounts on startup, so a freshly created
 * (zero-balance) account has somewhere to receive its first test payment from.
 *
 * <p>Runs on every startup but is idempotent: the dummy user/accounts are only
 * created the first time, since {@code ddl-auto=update} never truncates the
 * database between runs.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    /** Demo-only credentials, printed to the log on first seed — not for production use. */
    private static final String DUMMY_USERNAME = "dummy_bank";
    private static final String DUMMY_PASSWORD = "Dummy@12345";

    private static final BigDecimal SEED_BALANCE = new BigDecimal("10000.00");

    private record SeedAccount(String accountNumber, String currency, AccountType accountType) {
    }

    private static final List<SeedAccount> SEED_ACCOUNTS = List.of(
            new SeedAccount("900000000001", "USD", AccountType.SAVINGS),
            new SeedAccount("900000000002", "EUR", AccountType.CURRENT),
            new SeedAccount("900000000003", "INR", AccountType.SALARY),
            new SeedAccount("900000000004", "USD", AccountType.CURRENT)
    );

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository,
                      AccountRepository accountRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!userRepository.existsByUsername(DUMMY_USERNAME)) {
            User dummyUser = new User();
            dummyUser.setUsername(DUMMY_USERNAME);
            dummyUser.setPassword(passwordEncoder.encode(DUMMY_PASSWORD));
            userRepository.save(dummyUser);
            log.info("Seeded demo bank user '{}' (password: '{}') — for local testing only",
                    DUMMY_USERNAME, DUMMY_PASSWORD);
        }

        for (SeedAccount seed : SEED_ACCOUNTS) {
            if (accountRepository.existsById(seed.accountNumber())) {
                continue;
            }

            Account account = new Account();
            account.setAccountNumber(seed.accountNumber());
            account.setUsername(DUMMY_USERNAME);
            account.setCurrency(seed.currency());
            account.setBalance(SEED_BALANCE);
            account.setBankAccountNumber(seed.accountNumber());
            account.setAccountHolderName("FlashPay Demo Funds");
            account.setBankName("FlashPay Demo Bank");
            account.setAccountType(seed.accountType());
            accountRepository.save(account);
            log.info("Seeded demo funded account {} ({} {})",
                    seed.accountNumber(), SEED_BALANCE, seed.currency());
        }
    }
}