# Grocery Store Application

A clean code Java application that simulates a grocery store shopping experience with modular components for products, shopping carts, discounts, and receipt generation.

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

## Getting Started

### Prerequisites
- Java 17 +
- Maven 3.6+

### Build and Run
```bash
# Build the project
mvn clean install

# Run the application
mvn exec:java -Dexec.mainClass="grocery.Main"

# Run tests
mvn test
```

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
