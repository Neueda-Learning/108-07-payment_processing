# Architecture

This documents how the system maps onto the layered architecture suggested in
`payment_processing.md` (Appendix G: Architecture Suggestions).

## Layer diagram (as implemented)

```
┌─────────────────────────────────────────────┐
│               Web UI (Frontend)               │
│   React (frontend/src)                        │
│   - components/ (Dashboard, CreatePayment,     │
│     PaymentList, PaymentDetails, AuditHistory, │
│     Login, Signup, AddBankAccount, Navbar)     │
│   - context/AuthContext.js                     │
│   - services/api.js, services/localAuth.js     │
└──────────────────┬────────────────────────────┘
                   │ HTTP/REST (JSON, JWT bearer token)
┌──────────────────▼────────────────────────────┐
│               REST API Layer                    │
│   Spring Boot (backend/src/main/java/com/payments)│
│   - controller/                                  │
│     AccountController, AuthController,           │
│     PaymentController                            │
│   - dto/ (request/response records, e.g.         │
│     PaymentRequest, PaymentResponse, AuthRequest) │
│   - exception/GlobalExceptionHandler             │
│     (translates exceptions to ErrorResponse)      │
│   - security/                                    │
│     JwtAuthenticationFilter, JwtTokenProvider,    │
│     UserDetailsServiceImpl,                       │
│     RestAuthenticationEntryPoint                  │
│   - config/SecurityConfig, OpenApiConfig          │
├───────────────────────────────────────────────────┤
│               Business Logic Layer                │
│   service/                                         │
│   - PaymentService                                 │
│     (validation, idempotency, status transitions,  │
│      account balance side-effects, audit history)  │
│   - AccountService (account creation/validation)    │
│   - AuthService (registration/login)                │
├───────────────────────────────────────────────────┤
│               Data Access Layer                    │
│   repository/ (Spring Data JPA)                     │
│   - PaymentRepository                               │
│   - PaymentStatusHistoryRepository                  │
│   - AccountRepository                               │
│   - UserRepository                                  │
│   model/ (JPA entities)                             │
│   - Payment, PaymentStatus, PaymentStatusHistory,    │
│     Account, AccountType, User                       │
│   @Transactional boundaries defined in service layer │
└──────────────────┬────────────────────────────────┘
                   │
┌──────────────────▼────────────────────────────────┐
│                     Database                        │
│   MySQL (payment_processing_db)                      │
│   - Configured via                                    │
│     backend/src/main/resources/application.properties│
│   - Hibernate ddl-auto=update                         │
└───────────────────────────────────────────────────┘
```

## How the key considerations were addressed

* **Separate concerns into distinct layers** — enforced by package structure:
  `controller` (HTTP), `service` (business rules), `repository` (persistence),
  `dto` (API contracts), `model` (entities), `security` (auth), `exception`
  (error translation), `config` (wiring).
* **Business logic testable independent of database** — all payment/account
  rules live in `PaymentService` / `AccountService`, which depend on repository
  interfaces (not JDBC/SQL directly), so they can be tested against mocked
  repositories.
* **Repository pattern** — `AccountRepository`, `PaymentRepository`,
  `PaymentStatusHistoryRepository`, and `UserRepository` are Spring Data JPA
  interfaces; controllers and services never issue SQL directly.
* **Dependency injection** — Spring Boot constructor injection is used
  throughout (e.g. `PaymentService` receives `PaymentRepository`,
  `PaymentStatusHistoryRepository`, and `AccountRepository` via its
  constructor), keeping components loosely coupled and swappable in tests.
* **Transaction management** — service methods that mutate state
  (`createPayment`, `advancePaymentStatus`, `failPayment`, etc.) are annotated
  `@Transactional`, so a payment update and its corresponding audit-history
  row commit or roll back together.

## Cross-cutting concerns

* **Authentication** — stateless JWT auth: `JwtAuthenticationFilter` reads the
  bearer token on each request, `JwtTokenProvider` issues/validates it, and
  `SecurityConfig` wires the filter chain plus `RestAuthenticationEntryPoint`
  for unauthenticated responses.
* **Error handling** — `GlobalExceptionHandler` is the single place that maps
  domain exceptions (`PaymentNotFoundException`, `InvalidStatusTransitionException`,
  `DuplicatePaymentException`, `PaymentValidationException`,
  `AccountValidationException`, etc.) to a consistent `ErrorResponse` shape and
  HTTP status, per Appendix B's error code table.
* **API documentation** — `OpenApiConfig` exposes Swagger/OpenAPI docs for the
  REST layer.
