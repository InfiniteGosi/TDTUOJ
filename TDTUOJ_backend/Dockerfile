# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies first (pom rarely changes vs src)
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Build the jar
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app

# Non-root user
RUN useradd -r -u 1001 appuser
COPY --from=build /app/target/TDTUOJ-*.jar app.jar
USER appuser

EXPOSE 8090
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
