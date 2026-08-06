-- =====================================================================
-- Payment Processing Database Schema
-- Chronological, de-duplicated schema/migration script.
-- Run top to bottom against a fresh MySQL 8.0 server to reproduce the
-- current schema used by the application.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS payment_processing_db;
USE payment_processing_db;

-- ================================
-- 0. BASE SCHEMA
-- ================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS payment_status_history;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id       BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50)  NOT NULL,
    password VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE payments (
    id       BINARY(16)    NOT NULL,
    amount   DECIMAL(19,2) NOT NULL,
    currency VARCHAR(3)    NOT NULL,
    status   VARCHAR(20)   NOT NULL DEFAULT 'CREATED',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE payment_status_history (
    id            BIGINT     NOT NULL AUTO_INCREMENT,
    payment_id    BINARY(16) NOT NULL,
    old_status    VARCHAR(20)  DEFAULT NULL,
    status        VARCHAR(20)  NOT NULL,
    timestamp     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason        VARCHAR(255) DEFAULT NULL,
    error_code    VARCHAR(50)  DEFAULT NULL,
    error_message VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY fk_payment_history_payment (payment_id),
    CONSTRAINT fk_payment_history_payment
        FOREIGN KEY (payment_id) REFERENCES payments (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ================================
-- 1. PAYMENTS: idempotency, account & audit columns
-- ================================

ALTER TABLE payments
    ADD COLUMN source_account      VARCHAR(34)  NOT NULL AFTER currency,
    ADD COLUMN destination_account VARCHAR(34)  NOT NULL AFTER source_account,
    ADD COLUMN description         VARCHAR(255) NULL     AFTER status,
    ADD COLUMN idempotency_key     VARCHAR(100) NULL     AFTER description,
    ADD COLUMN error_code          VARCHAR(50)  NULL     AFTER idempotency_key,
    ADD COLUMN error_message       VARCHAR(255) NULL     AFTER error_code,
    ADD COLUMN created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER error_message,
    ADD COLUMN updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
    ADD COLUMN version             BIGINT NOT NULL DEFAULT 0 AFTER updated_at;

ALTER TABLE payments
    ADD UNIQUE KEY uk_payments_idempotency_key (idempotency_key);

ALTER TABLE payments DROP COLUMN updated_at;

ALTER TABLE payments DROP COLUMN version;

-- ================================
-- 2. ACCOUNTS TABLE
-- ================================

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

-- Add the new bank-detail columns
ALTER TABLE accounts
    ADD COLUMN bank_account_number VARCHAR(34) NULL AFTER balance,
    ADD COLUMN account_holder_name VARCHAR(100) NULL AFTER bank_account_number,
    ADD COLUMN bank_name VARCHAR(100) NULL AFTER account_holder_name,
    ADD COLUMN account_type ENUM('SAVINGS', 'CURRENT', 'SALARY') NULL AFTER bank_name;

-- Backfill existing rows
SET SQL_SAFE_UPDATES = 0;

UPDATE accounts
SET bank_account_number = COALESCE(bank_account_number, account_number),
    account_holder_name = COALESCE(account_holder_name, username),
    bank_name            = COALESCE(bank_name, 'UNKNOWN'),
    account_type         = COALESCE(account_type, 'SAVINGS')
WHERE bank_account_number IS NULL
   OR account_holder_name IS NULL
   OR bank_name IS NULL
   OR account_type IS NULL;

SET SQL_SAFE_UPDATES = 1;

-- Verify no NULLs remain
SELECT * FROM accounts
WHERE bank_account_number IS NULL
   OR account_holder_name IS NULL
   OR bank_name IS NULL
   OR account_type IS NULL;

-- Lock down to NOT NULL (only after the SELECT above returns 0 rows)
ALTER TABLE accounts
    MODIFY COLUMN bank_account_number VARCHAR(34) NOT NULL,
    MODIFY COLUMN account_holder_name VARCHAR(100) NOT NULL,
    MODIFY COLUMN bank_name VARCHAR(100) NOT NULL,
    MODIFY COLUMN account_type ENUM('SAVINGS', 'CURRENT', 'SALARY') NOT NULL;

-- ================================
-- 3. PAYMENTS: multi-currency conversion columns
-- ================================

-- Add the new columns
ALTER TABLE payments
    ADD COLUMN destination_currency VARCHAR(3) NULL AFTER currency,
    ADD COLUMN exchange_rate DECIMAL(19,6) NULL AFTER destination_currency,
    ADD COLUMN converted_amount DECIMAL(19,2) NULL AFTER exchange_rate;

-- Backfill existing rows (previously all same-currency, so rate is 1:1)
SET SQL_SAFE_UPDATES = 0;

UPDATE payments
SET destination_currency = currency,
    exchange_rate = 1.000000,
    converted_amount = amount
WHERE destination_currency IS NULL;

SET SQL_SAFE_UPDATES = 1;

-- Verify no NULLs remain
SELECT * FROM payments
WHERE destination_currency IS NULL
   OR exchange_rate IS NULL
   OR converted_amount IS NULL;

-- Lock down to NOT NULL (only after the SELECT above returns 0 rows)
ALTER TABLE payments
    MODIFY COLUMN destination_currency VARCHAR(3) NOT NULL,
    MODIFY COLUMN exchange_rate DECIMAL(19,6) NOT NULL,
    MODIFY COLUMN converted_amount DECIMAL(19,2) NOT NULL;

-- ================================
-- 4. USERS: password hash column
-- ================================

ALTER TABLE users
    ADD COLUMN password_hash VARCHAR(255) NULL;

-- ================================
-- 5. APPLICATION DATABASE USER
-- ================================

CREATE USER IF NOT EXISTS 'payment_user'@'localhost' IDENTIFIED BY 'password123';
GRANT ALL PRIVILEGES ON payment_processing_db.* TO 'payment_user'@'localhost';
FLUSH PRIVILEGES;

SELECT User, Host FROM mysql.user WHERE User='payment_user';