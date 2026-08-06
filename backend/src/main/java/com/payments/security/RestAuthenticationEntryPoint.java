package com.payments.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.payments.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * What an unauthenticated request to a protected endpoint gets back.
 *
 * <p>Without this, Spring Security returns its own default 401 body, which is a
 * different shape from every other error the API produces. GlobalExceptionHandler
 * cannot cover it, because rejection happens in the filter chain before any
 * controller is reached — so the one consistent error contract is enforced here too.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        objectMapper.writeValue(response.getOutputStream(),
                ErrorResponse.of("UNAUTHORIZED",
                        "Authentication is required to access this resource"));
    }
}
