# Build stage
FROM gradle:8.7-jdk17 AS build
WORKDIR /app

# Copy the wrapper and build files first to cache dependencies
COPY backend/gradle backend/gradle
COPY backend/gradlew backend/
COPY backend/build.gradle backend/
COPY backend/settings.gradle backend/

# Set working directory to backend
WORKDIR /app/backend

# Download dependencies (this caches them for faster subsequent builds)
RUN chmod +x ./gradlew
RUN ./gradlew dependencies --no-daemon || true

# Copy the actual source code
COPY backend/src src

# Build the application without running tests to save time
RUN ./gradlew build -x test --no-daemon

# Run stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/backend/build/libs/*-SNAPSHOT.jar app.jar

# Expose the default Spring Boot port
EXPOSE 8080

# Start the application
ENTRYPOINT ["java", "-jar", "app.jar"]
