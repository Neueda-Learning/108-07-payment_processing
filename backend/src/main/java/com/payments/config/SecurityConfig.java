package com.payments.config;

// TODO: Implement Spring Security configuration
//
// Responsibilities:
//   - Configure SecurityFilterChain
//   - Permit POST /api/auth/login without authentication
//   - Require JWT authentication for all other /api/** endpoints
//   - Register JwtAuthenticationFilter before UsernamePasswordAuthenticationFilter
//   - Configure CORS to allow React frontend origin (from application.properties)
//   - Disable CSRF (stateless JWT API)
//   - Set session policy to STATELESS
//   - Expose AuthenticationManager bean
//   - Expose PasswordEncoder (BCryptPasswordEncoder) bean
