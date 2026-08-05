USE payment_processing_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS payment_status_history;
DROP TABLE IF EXISTS payments;

CREATE TABLE payments (
    id BINARY(16) NOT NULL,
    amount DECIMAL(19,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE payment_status_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    payment_id BINARY(16) NOT NULL,
    old_status VARCHAR(20) DEFAULT NULL,
    status VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255) DEFAULT NULL,
    error_code VARCHAR(50) DEFAULT NULL,
    error_message VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY fk_payment_history_payment (payment_id),
    CONSTRAINT fk_payment_history_payment
        FOREIGN KEY (payment_id) REFERENCES payments (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;


//copy paste hereafter
ALTER TABLE payments
    ADD COLUMN source_account      VARCHAR(34)  NOT NULL AFTER currency,
    ADD COLUMN destination_account VARCHAR(34)  NOT NULL AFTER source_account,
    ADD COLUMN description         VARCHAR(255) NULL     AFTER status,
    ADD COLUMN idempotency_key     VARCHAR(100) NULL     AFTER description,
    ADD COLUMN error_code          VARCHAR(50)  NULL     AFTER idempotency_key,
    ADD COLUMN error_message       VARCHAR(255) NULL     AFTER error_code,
    ADD COLUMN created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER error_message,
    ADD COLUMN updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
    ADD COLUMN version            BIGINT NOT NULL DEFAULT 0 AFTER updated_at;

ALTER TABLE payments
    ADD UNIQUE KEY uk_payments_idempotency_key (idempotency_key);
    
ALTER TABLE payments DROP COLUMN updated_at;

ALTER TABLE payments DROP COLUMN version;


CREATE TABLE accounts (
    account_number VARCHAR(34) NOT NULL,
    username       VARCHAR(50) NOT NULL,
    currency       VARCHAR(3)  NOT NULL,
    balance        DECIMAL(19,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (account_number),
    KEY fk_accounts_username (username),
    CONSTRAINT fk_accounts_username
        FOREIGN KEY (username) REFERENCES users (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE accounts
  ADD COLUMN bank_account_number VARCHAR(34) NULL AFTER balance,
  ADD COLUMN account_holder_name VARCHAR(100) NULL AFTER bank_account_number,
  ADD COLUMN bank_name VARCHAR(100) NULL AFTER account_holder_name,
  ADD COLUMN account_type ENUM('SAVINGS', 'CURRENT', 'SALARY') NULL AFTER bank_name;