# Clean Code Grocellery App

This project is a grocery store application built with a microservices architecture. It is designed for both local development and fully automated cloud deployment to AWS.

---

## AWS Cloud Deployment Documentation

This project is architected for a fully automated, production-ready deployment to the AWS cloud. The deployment strategy is built on the principles of Infrastructure as Code (IaC) and a complete CI/CD pipeline, ensuring that deployments are reliable, repeatable, and secure.

### Infrastructure as Code (IaC) with Terraform

The entire cloud infrastructure is managed declaratively using **Terraform**, with all configuration files located in the `/terraform` directory. This IaC approach means that the complete architecture—from networking to databases to the application services themselves—is treated as code, versioned in Git, and can be created or destroyed reliably.

Key components of the AWS architecture provisioned by Terraform include:

- **Networking:** A custom, secure **Amazon VPC** is created with public and private subnets. Public-facing resources like the load balancer reside in the public subnets, while the core application and database are protected in the private subnets, inaccessible from the public internet.
- **Container Orchestration:** The microservices are deployed as Docker containers managed by **Amazon ECS (Elastic Container Service)** on **AWS Fargate**. Fargate is a serverless compute engine for containers, which removes the need to manage underlying EC2 instances, simplifying operations and scaling.
- **Database:** For cost-effectiveness in an MVP environment, all services connect to a single, shared **Amazon RDS for PostgreSQL** database instance. This provides a managed, reliable, and scalable database solution.
- **Load Balancing:** An **Application Load Balancer (ALB)** serves as the single entry point for all user traffic. It inspects the URL path of incoming requests and routes them to the appropriate microservice (e.g., requests to `/cart-service/*` are routed to the Cart Service).

### Automated CI/CD Pipeline

A continuous integration and continuous delivery (CI/CD) pipeline, built with **AWS CodePipeline**, automates the entire process of moving code from a developer's commit to a live deployment in the cloud.

The pipeline consists of the following stages:

1.  **Source:** The pipeline is automatically triggered by a `git push` to the `main` branch of the AWS CodeCommit repository.
2.  **Build:** An **AWS CodeBuild** project takes over, performing the core CI tasks. It compiles the Java code, runs unit tests with Maven (`mvn clean install`), and then builds a new Docker image for each microservice. These images are tagged and pushed to their respective **Amazon ECR (Elastic Container Registry)** repositories.
3.  **Deploy (Plan & Apply):** The deployment is handled safely in two steps:
    *   **Terraform Plan:** A second CodeBuild project runs `terraform plan`, which generates a preview of the infrastructure changes. The pipeline then **pauses for manual approval**, providing a critical safety gate to prevent accidental changes.
    *   **Terraform Apply:** Once the plan is approved in the AWS Console, the pipeline proceeds. It runs `terraform apply`, which instructs Terraform to update the infrastructure. Terraform detects the new Docker image in ECR and updates the corresponding ECS Task Definition. This action automatically triggers a **zero-downtime rolling deployment** of the new application version in ECS.

---

## Microservice-Based Development (Local)

This application is designed using the microservices architectural style, where the system is decomposed into small, independent services. Each microservice is responsible for a specific business capability and can be developed, deployed, and scaled independently.

### Microservices in This Project
- **Product Service:** Manages the product catalog and exposes product-related APIs.
- **Cart Service:** Handles shopping cart operations for users.
- **Order Service:** Manages order creation and processing.
- **Summary Service:** Generates purchase summaries and receipts.

Services use REST for request-response operations and Kafka for asynchronous order-created events. Order Service persists `order.created.v1` with the order, then a leased publisher delivers it to Kafka. Summary Service consumes it to build its summary read model. For local development, each service has its own database, codebase, and can be tested and deployed independently.

## Prerequisites

- Java 21
- Maven
- Docker
- Docker Compose

## Getting Started (Local)

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

## Quick Start

```sh
git clone <repo-url>
cd clean-code-grocellery-app
docker-compose up
```
Access services at:
- Cart: `{CART_SERVICE_BASE_URL}`
- Order: `{ORDER_SERVICE_BASE_URL}`
- Product: `{PRODUCT_SERVICE_BASE_URL}`
- Summary: `{SUMMARY_SERVICE_BASE_URL}`

## Service Endpoints

Use the following placeholders for environment-specific service hosts:

| Service   | Base URL placeholder         | Swagger UI                                    |
|-----------|------------------------------|-----------------------------------------------|
| Cart      | `{CART_SERVICE_BASE_URL}`    | `{CART_SERVICE_BASE_URL}/swagger-ui.html`     |
| Order     | `{ORDER_SERVICE_BASE_URL}`   | `{ORDER_SERVICE_BASE_URL}/swagger-ui.html`    |
| Product   | `{PRODUCT_SERVICE_BASE_URL}` | `{PRODUCT_SERVICE_BASE_URL}/swagger-ui.html`  |
| Summary   | `{SUMMARY_SERVICE_BASE_URL}` | `{SUMMARY_SERVICE_BASE_URL}/swagger-ui.html`  |

## Environment Variables

| Variable                  | Description                | Default Value         |
|---------------------------|----------------------------|----------------------|
| POSTGRES_USER             | DB username                |         |
| POSTGRES_PASSWORD         | DB password                |        |
| POSTGRES_DB               | DB name                    | grocery          |
| JWT_SECRET                | JWT signing key            | Required outside test |
| KAFKA_BOOTSTRAP_SERVERS   | Kafka broker bootstrap address | Required in production |
| KAFKA_ORDER_CREATED_TOPIC | Versioned order-created topic | `order.created.v1` |
| KAFKA_SUMMARY_CONSUMER_GROUP | Summary consumer group | `summary-service` |

## Architecture

```mermaid
flowchart LR
  CartService[Cart Service] --> CartDB[(Cart DB)]
  ProductService[Product Service] --> ProductDB[(Product DB)]

  subgraph OrderBoundary[Order Service]
    OrderApi[Order API] --> OrderDB[(Order DB)]
    OrderApi --> EventStore[(Order Event Store)]
    EventPublisher[Leased Event Publisher] --> EventStore
  end

  EventPublisher -->|order.created.v1| Kafka[(Kafka)]

  subgraph SummaryBoundary[Summary Service]
    EventConsumer[Order-Created Consumer] --> SummaryDB[(Summary DB)]
  end

  Kafka -->|summary-service consumer group| EventConsumer
  Prometheus[Prometheus] --> CartService
  Prometheus --> OrderApi
  Prometheus --> ProductService
  Prometheus --> EventConsumer
  Grafana[Grafana] --> Prometheus
```

## Running Tests

To run all tests for a service:
```sh
mvn test -pl microservices/cart-service -Dspring.profiles.active=test
```

## Monitoring

- Prometheus: `{PROMETHEUS_BASE_URL}`
- Grafana: `{GRAFANA_BASE_URL}` (default login:)

## Features

- Product management with validation
- Shopping cart operations
- Flexible discount system
- Receipt generation
- Asynchronous order-created summaries through Kafka

## Kafka Integration

For the event flow, configuration reference, failure handling, local commands, and operational practices, see [Kafka Integration Guide](../docs/kafka-integration.md).

Order Service writes a typed `OrderCreatedEvent` to its transactional event store with the order. A scheduled relay claims events with a time-limited lease, publishes them outside the database transaction, and records the result. This prevents Kafka latency from holding database locks and enables recovery after a publisher instance stops. Failed publishes are retried with a configurable delay and become terminal `FAILED` records after the configured maximum retries. Summary Service consumes the event with its own consumer group. A unique `summary.order_id` constraint and duplicate check make standard Kafka redelivery idempotent.

Configure the relay with `KAFKA_EVENT_STORE_BATCH_SIZE`, `KAFKA_EVENT_STORE_LEASE_DURATION`, `KAFKA_EVENT_STORE_RETRY_DELAY`, and `KAFKA_EVENT_STORE_MAXIMUM_RETRIES`. The initial publish is followed by at most the configured number of retries. Terminal failures must be monitored and replayed only after their cause is resolved. Summary Service retries consumer failures using `KAFKA_SUMMARY_MAXIMUM_RETRIES`, then publishes the original record to `order.created.v1.failed` for diagnosis and controlled replay.

Docker Compose includes a single-node Kafka broker for development and initializes the order-created and failed-event topics explicitly. Production deployments must provide managed Kafka with at least three brokers, topic replication factor `3`, `min.insync.replicas=2`, and TLS/SASL configured at the platform level.

## Technical Stack

- Java 21
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

Each microservice exposes interactive API documentation via Swagger UI. You can access these endpoints whether running the services locally or inside Docker containers (as long as the ports are mapped):

- **cart-service:** `{CART_SERVICE_BASE_URL}/swagger-ui.html` or `{CART_SERVICE_BASE_URL}/swagger-ui/index.html`
- **order-service:** `{ORDER_SERVICE_BASE_URL}/swagger-ui.html` or `{ORDER_SERVICE_BASE_URL}/swagger-ui/index.html`
- **product-service:** `{PRODUCT_SERVICE_BASE_URL}/swagger-ui.html` or `{PRODUCT_SERVICE_BASE_URL}/swagger-ui/index.html`
- **summary-service:** `{SUMMARY_SERVICE_BASE_URL}/swagger-ui.html` or `{SUMMARY_SERVICE_BASE_URL}/swagger-ui/index.html`


If the `/swagger-ui.html` path does not work, try `/swagger-ui/index.html`.

You can also view the raw OpenAPI spec at:
- `{SERVICE_BASE_URL}/v3/api-docs`

## Health Checks (Actuator)

Each service exposes a health endpoint via Spring Boot Actuator:

- **cart-service:** `{CART_SERVICE_BASE_URL}/actuator/health`
- **order-service:** `{ORDER_SERVICE_BASE_URL}/actuator/health`
- **product-service:** `{PRODUCT_SERVICE_BASE_URL}/actuator/health`
- **summary-service:** `{SUMMARY_SERVICE_BASE_URL}/actuator/health`

If you get an empty reply or 401 error, make sure the service is running and that your security configuration allows unauthenticated access to `/actuator/health`.

## Troubleshooting

- Ensure the service is running and mapped to the correct port (see `docker-compose ps`).
- If running inside Docker, make sure you are accessing the correct host port.
  
- If you get an empty reply from `/actuator/health`, check your security configuration to allow public access to actuator endpoints.
- Check service logs with `docker logs <container-name>` for errors.

## Test Credentials for Microservices

All microservices are secured with HTTP Basic authentication. 

The Swagger UI and OpenAPI documentation endpoints are publicly accessible without authentication.

## Sample Data

The product-service is preloaded with the following demo products for showcase purpose.

## JWT Authentication Integration

All microservices use JWT (JSON Web Token) authentication for securing APIs. Each service requires a unique JWT secret, which should be set via environment variables or configuration files. **Never commit real secrets to version control.**

### Setting JWT Secrets for Local Development and Testing

- Each service should have a unique value for `JWT_SECRET`.
- Runtime profiles fail startup when the JWT signing key is missing or blank.
- These files are ignored by git (see `.gitignore`).

### Production Secrets
- Set `JWT_SECRET` as an environment variable or in a secure config file (never commit secrets).
- Example for Docker Compose:
  ```yaml
  environment:
    - JWT_SECRET=${JWT_SECRET}
  ```

### Swagger/OpenAPI and Test Security
- All Swagger UI and OpenAPI endpoints are accessible without authentication.
- In tests, a test-specific security config disables authentication for controller tests, so you do not need to provide tokens in test code.
- To test authentication logic, create dedicated integration/security tests.

### Rotating Secrets
- To rotate a secret, update the value in your environment or test properties and restart the service.
