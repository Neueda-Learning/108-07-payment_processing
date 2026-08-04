package com.payments.security;

import com.payments.model.User;
import com.payments.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Bridges our {@link User} entity to the user object Spring Security understands.
 *
 * <p>Note what this class does <em>not</em> do: compare passwords. It hands back the
 * stored hash and Spring Security checks it with the BCrypt encoder. Hand-rolling that
 * comparison is how timing attacks get written.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final String DEFAULT_ROLE = "ROLE_USER";

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                List.of(new SimpleGrantedAuthority(DEFAULT_ROLE))
        );
    }
}
