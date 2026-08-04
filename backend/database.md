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