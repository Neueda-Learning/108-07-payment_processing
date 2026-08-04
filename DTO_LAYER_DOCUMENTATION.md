# DTO Layer Implementation Documentation

## 1. What I implemented
I implemented the DTO layer as Java records in the package `com.payments.dto`.

The DTO layer is used to:
- Accept request data from clients.
- Return clean response data to clients.
- Keep API models separate from database entities.
- Apply input validation close to API boundaries.

## 2. Design approach (simple)
I used these patterns across all DTOs:
- `record` types for concise, immutable data objects.
- Bean Validation annotations (`@NotBlank`, `@NotNull`, `@Size`, etc.) for request checks.
- Small static factory methods (`from(...)`, `of(...)`, `bearer(...)`) where mapping/creation logic is needed.

This keeps controllers/services cleaner and ensures consistent API payloads.

## 3. File-by-file explanation

### AuthRequest.java
- Purpose: Login request body.
- Fields: `username`, `password`.
- Validation: both are required (`@NotBlank`).

### AuthResponse.java
- Purpose: Login success response.
- Fields: `token`, `tokenType`.
- Implementation detail: `bearer(String token)` helper returns token type as `Bearer` automatically.

### RegisterRequest.java
- Purpose: Signup request body.
- Fields: `username`, `password`.
- Validation:
  - Username required, 3-50 chars, allowed chars only (`a-z`, `A-Z`, `0-9`, `_`, `.`, `-`).
  - Password required, minimum 6 chars.

### PaymentRequest.java
- Purpose: Create payment request body.
- Fields: `amount`, `currency`.
- Validation:
  - `amount` is required, positive, max 1,000,000.00, max 2 decimal places.
  - `currency` is required and must be exactly 3 characters.
- Note: full ISO-4217 membership check is expected in service logic.

### PaymentResponse.java
- Purpose: Payment response returned by APIs.
- Fields: `id`, `amount`, `currency`, `status`.
- Implementation detail: `from(Payment payment)` maps entity to DTO and converts enum status to string.

### StatusHistoryResponse.java
- Purpose: One payment status history item in API responses.
- Fields: `oldStatus`, `status`, `timestamp`, `reason`, `errorCode`, `errorMessage`.
- Implementation detail: `from(PaymentStatusHistory history)` maps history entity to DTO, including null-safe old status.

### FailPaymentRequest.java
- Purpose: Request body for marking a payment as failed.
- Field: `errorCode`.
- Behavior note: service can apply default error code when this field is empty.

### PaymentStatsResponse.java
- Purpose: Aggregated payment statistics response.
- Fields: `total`, `created`, `validated`, `sent`, `completed`, `failed`.
- Used for dashboard/reporting endpoints.

### ErrorResponse.java
- Purpose: Standard error body for failed requests.
- Fields: `errorCode`, `message`, `timestamp`.
- Implementation detail: `of(...)` helper creates response with current timestamp for consistency.

## 4. How DTO layer works in request flow
1. Client sends JSON request.
2. Controller binds it to a request DTO (for example `PaymentRequest`).
3. Validation runs automatically from annotations.
4. Service processes business logic with validated data.
5. API returns a response DTO (for example `PaymentResponse`, `AuthResponse`, `ErrorResponse`).

## 5. Why this implementation is good
- Simple and readable code using records.
- Strong input validation at boundary.
- Clear separation between API contract and persistence model.
- Consistent response format for both success and failure.
- Easy to maintain and extend when new fields/endpoints are added.
