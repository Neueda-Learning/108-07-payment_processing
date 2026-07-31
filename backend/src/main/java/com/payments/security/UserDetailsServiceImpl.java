package com.payments.security;

// TODO: Implement UserDetailsService backed by the database
//
// Responsibilities:
//   - Inject UserRepository
//   - Implement loadUserByUsername(String username)
//   - Look up User entity by username from the database
//   - Return a Spring Security User with role ROLE_USER
//   - Throw UsernameNotFoundException if the username does not exist
//
// Note: Password comparison is handled by Spring Security using BCryptPasswordEncoder.
//       Do NOT compare passwords manually here.
