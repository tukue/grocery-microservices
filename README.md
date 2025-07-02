t# Clean Code Grocellery App

This project is a grocery store application built with a microservices architecture.

## Microservice-Based Development

This application is designed using the microservices architectural style, where the system is decomposed into small, independent services. Each microservice is responsible for a specific business capability and can be developed, deployed, and scaled independently. This approach offers several benefits:

- **Separation of Concerns:** Each service encapsulates a specific domain or functionality (e.g., product management, cart, order processing, summary/receipt).
- **Independent Deployment:** Services can be updated or redeployed without affecting the entire system.
- **Scalability:** Individual services can be scaled based on demand.
- **Technology Diversity:** Each service can use the most appropriate technology stack or database for its needs.
- **Resilience:**  improving overall system reliability.

### Microservices in This Project
- **Product Service:** Manages the product catalog and exposes product-related APIs.
- **Cart Service:** Handles shopping cart operations for users.
- **Order Service:** Manages order creation and processing.
- **Summary Service:** Generates purchase summaries and receipts.

All services communicate via REST APIs and are containerized for easy orchestration with Docker Compose. Each service has its own database, codebase, and can be tested and deployed independently.

## Prerequisites

- Java 21
- Maven
- Docker
- Docker Compose

## Getting Started

### 1. Start the Databases

The project uses PostgreSQL databases for each microservice, which are managed with Docker Compose. To start the databases, run the following command from the root of the project:

```bash
docker-compose up -d
```

### 2. Configure the Application

For each microservice, you will need to create an `application.properties` file in the `src/main/resources` directory. You can do this by copying the `application.properties.example` file:

```bash
cp microservices/<service-name>/src/main/resources/application.properties.example microservices/<service-name>/src/main/resources/application.properties
```

**Note:** The example files are pre-configured with the correct database credentials for the Docker Compose setup, so you won't need to make any changes to them.

### 3. Run the Microservices

You can run each microservice using the following Maven command:

```bash
mvn spring-boot:run -pl microservices/<service-name>
```

For example, to run the `cart-service`:

```bash
mvn spring-boot:run -pl microservices/cart-service
```

The services will be available at the following ports:

- **cart-service:** 8081
- **order-service:** 8082
- **product-service:** 8083
- **summary-service:** 8084

## Running Tests

To run the tests for all modules, use the following command from the root of the project:

```bash
mvn test
```

### Authentication in Tests (Best Practice)

For all microservices, authentication is **disabled in controller tests** using a test-specific security configuration. This means:
- You do **not** need to provide credentials (e.g., `.with(httpBasic("user", "password"))`) in your test code.
- Tests focus on business logic, not authentication.
- Production security is unchanged; only the test profile disables authentication.

**How it works:**
- Each controller test includes a `@TestConfiguration` bean that overrides the security filter chain to permit all requests when the `test` profile is active.
- This follows Spring Boot best practices for clean, maintainable, and focused tests.

If you want to test authentication itself, create dedicated security tests or integration tests as needed.

## Features

- Product management with validation
- Shopping cart operations
- Flexible discount system
- Receipt generation

## Technical Stack

- Java 17
- JUnit 5 for testing
- Maven for build automation
- GitHub Actions for CI/CD

## Project Structure

The application follows clean code principles with:

- Domain objects: [`Product`](src/main/java/grocery/Product.java), [`CartItem`](src/main/java/grocery/CartItem.java)
- Core business logic: [`ShoppingCart`](src/main/java/grocery/Shopping

## Future Work: Spring Boot Integration

Planned enhancements with Spring Boot:

- RESTful API endpoints for cart operations
- Database integration with Spring Data JPA
- Product catalog management
- User authentication and authorization
- Shopping history and order tracking
- Discount rules management interface
- Web-based shopping interface
- Containerization with Docker

### Spring Boot Migration Steps

1. Add Spring Boot dependencies to pom.xml
2. Create service layer for business logic
3. Develop repository layer for data persistence
4. Implement REST controllers for API endpoints
5. Add Spring Security for authentication
6. Design database schema for products, orders, and users
7. Create Docker configuration
8. Implement unit and integration testing

## License

This project is available under the MIT License.

## API Documentation

Each microservice exposes interactive API documentation via Swagger UI:

- **cart-service:** http://localhost:8081/swagger-ui.html
- **order-service:** http://localhost:8082/swagger-ui.html
- **product-service:** http://localhost:8083/swagger-ui.html
- **summary-service:** http://localhost:8084/swagger-ui.html

## Test Credentials for Microservices

All microservices are secured with HTTP Basic authentication. 

The Swagger UI and OpenAPI documentation endpoints are publicly accessible without authentication.

## Sample Data

The product-service is preloaded with the following demo products for showcase purpose.
