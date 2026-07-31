package com.payments.security;

// TODO: Implement JWT authentication filter (extends OncePerRequestFilter)
//
// Responsibilities:
//   - Extract the Bearer token from the Authorization header
//   - Validate the token using JwtTokenProvider
//   - Load UserDetails via UserDetailsService
//   - Set UsernamePasswordAuthenticationToken in SecurityContextHolder
//   - On missing or invalid token: do NOT throw — simply continue the filter chain
//     (Spring Security will return 401 for protected routes)
