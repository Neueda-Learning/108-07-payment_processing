# JSON Server Endpoint Catalog

This project uses `json-server` as a mock backend on `http://localhost:3001`.

## Common Request Headers

- `Content-Type: application/json`
- `Authorization: Bearer <jwt_token>` (optional in mock mode; sent automatically by axios interceptor if token exists)

## Auth Endpoints

### 1) Register
- Method: `POST`
- URL: `/users`
- Used from frontend: `Signup` through `localRegister -> authApi.register`
- Request body:
```json
{
  "username": "john_doe",
  "password": "Password@1",
  "createdAt": "2026-08-04T10:00:00.000Z"
}
```
- Response body (json-server generated):
```json
{
  "id": "<generated>",
  "username": "john_doe",
  "password": "Password@1",
  "createdAt": "2026-08-04T10:00:00.000Z"
}
```

### 2) Login (lookup)
- Method: `GET`
- URL: `/users`
- Query params: `username` (frontend validates username/password from returned list)
- Used from frontend: `Login` through `localLogin -> authApi.login`
- Example request: `/users?username=demo`
- Example response:
```json
[
  {
    "id": "u1",
    "username": "demo",
    "password": "Demo@1234",
    "createdAt": "2026-08-04T00:00:00.000Z"
  }
]
```

## Payment Endpoints

### 3) Create payment
- Method: `POST`
- URL: `/payments`
- Used from frontend: `CreatePayment` through `localCreatePayment -> paymentsApi.create`
- Request body:
```json
{
  "id": "AB12CD34EF56",
  "sourceAccount": "123456789012",
  "destinationAccount": "210987654321",
  "amount": 100.5,
  "currency": "USD",
  "reference": "Invoice 45",
  "idempotencyKey": "idem-1722748800000-x2k3m9a",
  "status": "CREATED",
  "errorCode": null,
  "errorMessage": null,
  "createdAt": "2026-08-04T10:00:00.000Z",
  "updatedAt": "2026-08-04T10:00:00.000Z"
}
```

### 4) List payments
- Method: `GET`
- URL: `/payments`
- Optional query params: `status`, `idempotencyKey`
- Used from frontend: `Dashboard`, `PaymentList`, `paymentsApi.create` (idempotency check), `paymentsApi.getStats`
- Example requests:
  - `/payments`
  - `/payments?status=FAILED`
  - `/payments?idempotencyKey=idem-1722748800000-x2k3m9a`

### 5) Get payment by id
- Method: `GET`
- URL: `/payments/:id`
- Used from frontend: `PaymentDetails` and status transition operations

### 6) Update payment by id
- Method: `PUT`
- URL: `/payments/:id`
- Used from frontend:
  - `paymentsApi.advanceStatus`
  - `paymentsApi.failPayment`
- Request body: full payment object with updated `status` and `updatedAt`.

## Payment History Endpoints

### 7) Add payment history event
- Method: `POST`
- URL: `/paymentHistory`
- Used from frontend:
  - payment creation
  - advance status
  - fail status
- Request body:
```json
{
  "paymentId": "AB12CD34EF56",
  "fromStatus": "CREATED",
  "status": "VALIDATED",
  "timestamp": "2026-08-04T10:00:03.000Z",
  "errorCode": null,
  "note": "Advanced to VALIDATED"
}
```

### 8) Get payment history by payment id
- Method: `GET`
- URL: `/paymentHistory`
- Query param: `paymentId`
- Used from frontend: `PaymentDetails`
- Example: `/paymentHistory?paymentId=AB12CD34EF56`

## Frontend Usage Map

- `src/components/Signup.js` -> `localRegister`
- `src/components/Login.js` -> `localLogin`
- `src/components/Dashboard.js` -> `localGetAllPayments`, `localGetStats`
- `src/components/PaymentList.js` -> `localGetAllPayments`
- `src/components/CreatePayment.js` -> `localCreatePayment`
- `src/components/PaymentDetails.js` -> `localGetPaymentById`, `localGetPaymentHistory`, `localAdvanceStatus`
- `src/services/localAuth.js` -> wraps `authApi`
- `src/services/localPayments.js` -> wraps `paymentsApi`
- `src/services/api.js` -> axios client and endpoint operations

## How To Run

1. Start mock API
```bash
npm run mock
```

2. Start frontend (new terminal)
```bash
npm start
```
