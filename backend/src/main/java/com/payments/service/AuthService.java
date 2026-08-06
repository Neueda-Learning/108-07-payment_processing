package com.payments.service;

import com.payments.dto.AuthRequest;
import com.payments.dto.AuthResponse;
import com.payments.dto.RegisterRequest;
import com.payments.exception.UsernameAlreadyExistsException;
import com.payments.model.User;
import com.payments.repository.UserRepository;
import com.payments.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registration and login rules. Kept out of the controller for the same reason
 * PaymentService is: controllers translate HTTP, services decide things.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.authenticationManager = authenticationManager;
    }

    /**
     * Creates the account and returns a token immediately, so the client does not have
     * to turn round and call login with credentials it already has.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new UsernameAlreadyExistsException(request.username());
        }

        User user = new User();
        user.setUsername(request.username());
        user.setPassword(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        return AuthResponse.bearer(tokenProvider.generateToken(user.getUsername()));
    }

    /**
     * Delegates the credential check to Spring Security's AuthenticationManager, which
     * runs the stored hash through BCrypt for us. On failure it throws an
     * AuthenticationException, which GlobalExceptionHandler turns into a 401.
     */
    public AuthResponse login(AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        return AuthResponse.bearer(tokenProvider.generateToken(authentication.getName()));
    }
}
