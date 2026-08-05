# Database Extension — Idempotency & Account Fields

This documents the changes made to the `payments` table on the `feature/idempotency`
branch, in the order they were made. The checked-in schema files (`database.sql`,
`backend/database.md`) are intentionally **not** kept in sync with these changes —
schema changes for this branch are applied directly to the working database.

## 1. Starting point (MVP schema)

Before this branch, `payments` only carried the minimum fields needed for the
happy-path lifecycle:

```sql
CREATE TABLE payments (
    id BINARY(16) NOT NULL,
    amount DECIMAL(19,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    PRIMARY KEY (id)
);
```

There was no way to detect a duplicate submission, no source/destination account,
and no per-payment error detail — only what `payment_status_history` recorded.

## 2. Added idempotency, account and audit columns

To support idempotency, account validation, and surfacing the current failure
reason directly on a payment, the following columns were added:

```sql
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
```

Rationale:
- `source_account` / `destination_account` (`VARCHAR(34)`) — long enough for an
  IBAN or a plain account number. Required (`NOT NULL`) per Appendix C.
- `description` — optional free-text reference for the payment.
- `idempotency_key` — nullable but **unique**. MySQL allows multiple `NULL`s in a
  unique index, so payments without a key never collide with each other; two
  payments submitted with the *same* key do.
- `error_code` / `error_message` — the *current* failure reason, distinct from
  `payment_status_history`'s per-transition record of the reason **at the time**
  of each status change.
- `version` — backs JPA optimistic locking (`@Version`) for concurrent-update
  protection.

**No change was needed to `payment_status_history`.** Its existing
`old_status`, `status`, `timestamp`, `reason`, `error_code`, `error_message`
columns already capture everything that changes per transition. The new payment
columns above are attributes of the payment itself (they don't change per
transition), so duplicating them into every history row would add no audit
value.

## 3. Backend code updated to match

- `Payment` entity: added `sourceAccount`, `destinationAccount`, `description`,
  `idempotencyKey`, `errorCode`, `errorMessage`, `createdAt`, `updatedAt`,
  `version` (`@Version`).
- `PaymentRequest`: added required `sourceAccount`/`destinationAccount`,
  optional `description`/`idempotencyKey`.
- `PaymentResponse`: exposes all the new fields.
- `PaymentRepository`: added `findByIdempotencyKey`.
- `PaymentService`:
  - `createPayment` rejects a repeat `idempotencyKey` with
    `DuplicatePaymentException` → 409.
  - `createPayment` rejects matching source/destination accounts with
    `PaymentValidationException("INVALID_ACCOUNT", ...)` → 400.
  - `failPayment` now also persists `errorCode`/`errorMessage` onto the
    `Payment` row itself (previously only recorded in history).

## 4. Removed `updated_at`

Decided the entity didn't need a separate "last updated" timestamp alongside
`created_at` and the status-history audit trail, so it was dropped:

```sql
ALTER TABLE payments DROP COLUMN updated_at;
```

Corresponding removals: `Payment.updatedAt` field, its `@PreUpdate` hook, its
getter, and `PaymentResponse.updatedAt`.

## Current `payments` column set (end state of this branch so far)

| Column | Type | Notes |
|---|---|---|
| `id` | `BINARY(16)` | PK |
| `amount` | `DECIMAL(19,2)` | |
| `currency` | `VARCHAR(3)` | |
| `source_account` | `VARCHAR(34)` | required |
| `destination_account` | `VARCHAR(34)` | required |
| `status` | `VARCHAR(20)` | |
| `description` | `VARCHAR(255)` | optional |
| `idempotency_key` | `VARCHAR(100)` | optional, unique |
| `error_code` | `VARCHAR(50)` | optional, current failure |
| `error_message` | `VARCHAR(255)` | optional, current failure |
| `created_at` | `TIMESTAMP` | set once, not updatable |
| `version` | `BIGINT` | optimistic locking |
