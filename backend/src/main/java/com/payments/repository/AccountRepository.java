package com.payments.repository;

import com.payments.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccountRepository extends JpaRepository<Account, String> {

    List<Account> findByUsername(String username);

    /** Case-insensitive partial match, used to look up a payment *destination* by name. */
    List<Account> findByAccountHolderNameContainingIgnoreCase(String accountHolderName);
}

