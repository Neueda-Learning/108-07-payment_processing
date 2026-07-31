package com.payments.model;

// TODO: Implement User JPA entity
//
// Table: users
//
// Fields:
//   id        BIGSERIAL    PRIMARY KEY, auto-generated
//   username  VARCHAR(50)  NOT NULL, UNIQUE
//   password  VARCHAR(255) NOT NULL  (BCrypt hash — never store plain text)
//   createdAt TIMESTAMP    NOT NULL, auto-set on persist
//
// Use @PrePersist to set createdAt
// Implement UserDetails (or keep it as a plain entity and map in UserDetailsServiceImpl)
