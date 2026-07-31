package com.payments.model;

// TODO: Implement PaymentStatusHistory JPA entity
//
// Table: payment_status_history
//
// Fields:
//   id          BIGINT / UUID  PRIMARY KEY, generated
//   payment     ManyToOne      NOT NULL (FK → payments.id)
//   fromStatus  VARCHAR(20)    nullable  (null for the initial CREATED entry)
//   status      VARCHAR(20)    NOT NULL
//   timestamp   TIMESTAMP      NOT NULL, auto-set on persist
//   note        VARCHAR(500)   nullable  (e.g. error description, reason)
//   errorCode   VARCHAR(100)   nullable
//
// Use @PrePersist to set timestamp
