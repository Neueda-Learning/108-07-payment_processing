package com.payments.security;

// TODO: Implement JWT token provider
//
// Responsibilities:
//   - Generate a signed JWT for a given username
//     * Use HS256 with the secret from application.properties (app.jwt.secret)
//     * Set expiration from app.jwt.expiration-ms
//   - Validate a JWT string (signature + expiry)
//   - Extract username (subject) from a JWT
//   - All cryptographic operations must use the JJWT library
