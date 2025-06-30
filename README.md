# Clean Code Grocellery App

This project is a grocery store application built with a microservices architecture.

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
- Core business logic: [`ShoppingCart`](src/main/java/grocery/ShoppingCart.java), [`TaxCalculator`](src/main/java/grocery/TaxCalculator.java)
- Strategy pattern: [`Discount`](src/main/java/grocery/Discount.java) interface with implementations
- Output formatting: [`ReceiptPrinter`](src/main/java/grocery/ReceiptPrinter.java)

## Example Usage

```java
// Create products
Product apple = new Product("Apple", 0.50);
Product milk = new Product("Milk", 1.50);

// Use shopping cart
ShoppingCart cart = new ShoppingCart();
cart.addItem(apple, 4);
cart.addItem(milk, 2);
cart.setDiscount(new PercentageDiscount(0.10));

// Print receipt with tax
double tax = new TaxCalculator(0.07).calculateTax(cart.getTotalWithDiscount());
new ReceiptPrinter(System.out).printReceipt(cart, tax);
```

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

## Test Credentials for Microservices

All microservices are secured with HTTP Basic authentication. Use the following credentials to access protected endpoints:

- **Username:**
- **Password:**

The Swagger UI and OpenAPI documentation endpoints are publicly accessible without authentication.
