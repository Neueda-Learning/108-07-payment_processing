package com.payments.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end tests for {@code /api/auth/**} through the full Spring context (real
 * security filter chain, real password hashing, H2 in place of MySQL — see
 * src/test/resources/application.properties).
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String uniqueUsername(String prefix) {
        return prefix + "_" + System.nanoTime();
    }

    @Test
    void register_newUser_returns201WithBearerToken() throws Exception {
        String username = uniqueUsername("alice");
        String body = objectMapper.writeValueAsString(new Registration(username, "password123"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void register_duplicateUsername_returns409() throws Exception {
        String username = uniqueUsername("bob");
        String body = objectMapper.writeValueAsString(new Registration(username, "password123"));

        mockMvc.perform(post("/api/auth/register").contentType("application/json").content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register").contentType("application/json").content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("USERNAME_ALREADY_EXISTS"));
    }

    @Test
    void register_blankUsername_returns400ValidationFailed() throws Exception {
        String body = objectMapper.writeValueAsString(new Registration("", "password123"));

        mockMvc.perform(post("/api/auth/register").contentType("application/json").content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
    }

    @Test
    void login_validCredentials_returns200WithToken() throws Exception {
        String username = uniqueUsername("carol");
        String registerBody = objectMapper.writeValueAsString(new Registration(username, "password123"));
        mockMvc.perform(post("/api/auth/register").contentType("application/json").content(registerBody))
                .andExpect(status().isCreated());

        String loginBody = objectMapper.writeValueAsString(new Registration(username, "password123"));
        mockMvc.perform(post("/api/auth/login").contentType("application/json").content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void login_wrongPassword_returns401() throws Exception {
        String username = uniqueUsername("dave");
        String registerBody = objectMapper.writeValueAsString(new Registration(username, "password123"));
        mockMvc.perform(post("/api/auth/register").contentType("application/json").content(registerBody))
                .andExpect(status().isCreated());

        String loginBody = objectMapper.writeValueAsString(new Registration(username, "wrong-password"));
        mockMvc.perform(post("/api/auth/login").contentType("application/json").content(loginBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    @Test
    void login_unknownUser_returns401() throws Exception {
        String loginBody = objectMapper.writeValueAsString(new Registration("no-such-user", "whatever1"));

        mockMvc.perform(post("/api/auth/login").contentType("application/json").content(loginBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_CREDENTIALS"));
    }

    /** Shared shape for both {@code RegisterRequest} and {@code AuthRequest} bodies. */
    private record Registration(String username, String password) {
    }
}
