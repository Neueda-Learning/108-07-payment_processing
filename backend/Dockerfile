# ── Build stage ─────────────────────────────────────────────────────────────
FROM maven:3.9.16-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies separately from source so code-only changes don't
# re-download the world.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# ── Runtime stage ───────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN groupadd -r spring && useradd -r -g spring spring
USER spring:spring

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8082
ENTRYPOINT ["java", "-Dspring.profiles.active=docker", "-jar", "app.jar"]
