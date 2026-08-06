package com.payments.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI configuration, served at /swagger-ui.html.
 *
 * <p>Declaring the bearer scheme is what puts the "Authorize" button in the UI. Without
 * it every protected endpoint returns 401 when tried from the browser, and the
 * documentation is only readable rather than usable.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "BearerAuth";

    @Bean
    public OpenAPI paymentProcessingOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Payment Processing API")
                        .version("v1")
                        .description("""
                                Creates payments and tracks them through their lifecycle:
                                CREATED to VALIDATED to SENT to COMPLETED, with FAILED reachable \
                                from any stage before completion. Every status change is recorded \
                                on the payment's audit trail.

                                Register or log in via /api/auth to obtain a token, then press \
                                Authorize and paste it. Every /api/payments route requires one."""))

                // Applied globally, so each operation is marked as needing a token.
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))

                .components(new Components().addSecuritySchemes(BEARER_SCHEME,
                        new SecurityScheme()
                                .name(BEARER_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste the token from /api/auth/login — Swagger adds "
                                           + "the \"Bearer \" prefix for you.")));
    }
}
