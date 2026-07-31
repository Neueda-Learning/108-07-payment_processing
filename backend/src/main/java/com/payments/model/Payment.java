package com.payments.model;

// TODO: Implement Payment JPA entity
//
// Table: payments
//
// Fields:
//   id                  UUID          PRIMARY KEY, generated
//   sourceAccount       VARCHAR(100)  NOT NULL
//   destinationAccount  VARCHAR(100)  NOT NULL
//   amount              DECIMAL(19,4) NOT NULL
//   currency            VARCHAR(3)    NOT NULL  (ISO 4217)
//   status              VARCHAR(20)   NOT NULL  (PaymentStatus enum)
//   reference           VARCHAR(255)  nullable
//   idempotencyKey      VARCHAR(255)  UNIQUE, nullable
//   errorCode           VARCHAR(100)  nullable
//   errorMessage        VARCHAR(500)  nullable
//   createdAt           TIMESTAMP     NOT NULL, auto-set on persist
//   updatedAt           TIMESTAMP     NOT NULL, auto-set on update
//
// Relationships:
//   One Payment → Many PaymentStatusHistory (mappedBy = "payment")
//
// Use @PrePersist to set createdAt and updatedAt
// Use @PreUpdate to update updatedAt
