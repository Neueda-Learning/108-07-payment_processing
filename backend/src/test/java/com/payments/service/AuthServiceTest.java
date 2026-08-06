package com.payments.service;

import com.payments.dto.AuthRequest;
import com.payments.dto.AuthResponse;
import com.payments.dto.RegisterRequest;
import com.payments.exception.UsernameAlreadyExistsException;
import com.payments.model.User;
import com.payments.repository.UserRepository;
import com.payments.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// JwtTokenProvider is a concrete class with no interface, and AuthenticationManager's
// authenticate() returns Authentication (which extends the JDK's Principal/Serializable) —
// both fail to instrument under this Mockito/JDK combination's inline mock maker. Real
// instances / hand-written fakes are used instead so Mockito never needs to touch them.
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private final JwtTokenProvider tokenProvider =
            new JwtTokenProvider("test-only-256-bit-secret-key-not-for-production-use-32chars", 3_600_000L);

    private AuthService authService(AuthenticationManager authenticationManager) {
        return new AuthService(userRepository, passwordEncoder, tokenProvider, authenticationManager);
    }

    private AuthService authService;

    @BeforeEach
    void setUp() {
        // A no-op AuthenticationManager for tests that only exercise register(), which never
        // calls it.
        authService = authService(request -> new UsernamePasswordAuthenticationToken(request.getName(), null));
    }

    @Test
    void register_newUsername_savesHashedPasswordAndReturnsBearerToken() {
        RegisterRequest request = new RegisterRequest("alice", "password123");
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");

        AuthResponse response = authService.register(request);

        assertThat(response.token()).isNotBlank();
        assertThat(tokenProvider.getUsernameFromToken(response.token())).isEqualTo("alice");
        assertThat(response.tokenType()).isEqualTo("Bearer");

        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        assertThat(savedUser.getValue().getUsername()).isEqualTo("alice");
        assertThat(savedUser.getValue().getPassword()).isEqualTo("hashed-password");
    }

    @Test
    void register_usernameAlreadyExists_throwsAndDoesNotSave() {
        RegisterRequest request = new RegisterRequest("alice", "password123");
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(UsernameAlreadyExistsException.class);

        verify(userRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void login_validCredentials_returnsBearerTokenForAuthenticatedName() {
        AuthRequest request = new AuthRequest("alice", "password123");
        // A real UsernamePasswordAuthenticationToken (rather than a mocked Authentication) —
        // Authentication extends the JDK's Principal/Serializable, which this Mockito/JDK
        // combination can't instrument.
        AuthenticationManager fakeManager =
                authRequest -> new UsernamePasswordAuthenticationToken("alice", null);

        AuthResponse response = authService(fakeManager).login(request);

        assertThat(response.token()).isNotBlank();
        assertThat(tokenProvider.getUsernameFromToken(response.token())).isEqualTo("alice");
        assertThat(response.tokenType()).isEqualTo("Bearer");
    }

    @Test
    void login_invalidCredentials_propagatesAuthenticationException() {
        AuthRequest request = new AuthRequest("alice", "wrong-password");
        AuthenticationManager fakeManager = authRequest -> {
            throw new BadCredentialsException("Bad credentials");
        };

        assertThatThrownBy(() -> authService(fakeManager).login(request))
                .isInstanceOf(BadCredentialsException.class);
    }
}
