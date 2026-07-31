package com.payments.controller;

// TODO: Implement AuthController
//
// ── POST /api/auth/register ──────────────────────────────────────────────────
// Request body:
//   { "username": "alice", "password": "secret123" }
//
// Response (201 Created):
//   { "token": "<JWT string>", "tokenType": "Bearer" }
//
// Error responses:
//   400 Bad Request  — validation failed (blank fields, password too short, etc.)
//   409 Conflict     — username already taken
//
// Responsibilities:
//   - Validate request (username 3-50 chars, password min 6 chars)
//   - Check UserRepository.existsByUsername(); if true, return 409
//   - Hash password with BCryptPasswordEncoder
//   - Save new User entity to the database
//   - Generate JWT via JwtTokenProvider and return it (auto-login after register)
//
// ── POST /api/auth/login ─────────────────────────────────────────────────────
// Request body:
//   { "username": "alice", "password": "secret123" }
//
// Response (200 OK):
//   { "token": "<JWT string>", "tokenType": "Bearer" }
//
// Error responses:
//   401 Unauthorized — invalid credentials
//
// Responsibilities:
//   - Authenticate using AuthenticationManager
//   - On success, generate JWT via JwtTokenProvider and return it
//   - On AuthenticationException, return 401 with a clear error message
