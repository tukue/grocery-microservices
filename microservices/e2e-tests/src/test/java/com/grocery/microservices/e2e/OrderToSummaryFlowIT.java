package com.grocery.microservices.e2e;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grocery.microservices.order.OrderServiceApplication;
import com.grocery.microservices.order.client.CartClient;
import com.grocery.microservices.order.client.CartItemSnapshot;
import com.grocery.microservices.order.client.CartSnapshot;
import com.grocery.microservices.order.client.ProductClient;
import com.grocery.microservices.order.client.ProductSnapshot;
import com.grocery.microservices.summary.SummaryServiceApplication;
import com.grocery.microservices.summary.dto.CustomerSummaryDTO;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.web.client.RestTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.output.Slf4jLogConsumer;
import org.testcontainers.redpanda.RedpandaContainer;
import org.testcontainers.utility.DockerImageName;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;
import static org.awaitility.Awaitility.await;

class OrderToSummaryFlowIT {

    private static final DockerImageName POSTGRES_IMAGE = DockerImageName.parse("postgres:13");
    private static final DockerImageName REDPANDA_IMAGE =
            DockerImageName.parse("docker.redpanda.com/redpandadata/redpanda:v23.3.11");

    private static final int ORDER_PORT = 18081;
    private static final int SUMMARY_PORT = 18084;
    private static final String ORDER_BASE = "http://localhost:" + ORDER_PORT;
    private static final String SUMMARY_BASE = "http://localhost:" + SUMMARY_PORT;
    private static final String KAFKA_TOPIC = "order.created.v1";
    private static final String DLT_TOPIC = "order.created.v1.failed";

    private static PostgreSQLContainer<?> orderDb;
    private static PostgreSQLContainer<?> summaryDb;
    private static RedpandaContainer kafka;

    private static ConfigurableApplicationContext orderCtx;
    private static ConfigurableApplicationContext summaryCtx;

    private static final RestTemplate http = new RestTemplate();
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @BeforeAll
    static void startInfrastructureAndServices() throws Exception {
        Slf4jLogConsumer logConsumer = new Slf4jLogConsumer(org.slf4j.LoggerFactory.getLogger("docker"));

        orderDb = new PostgreSQLContainer<>(POSTGRES_IMAGE)
                .withDatabaseName("grocery")
                .withUsername("grocellery")
                .withPassword("grocellery");
        summaryDb = new PostgreSQLContainer<>(POSTGRES_IMAGE)
                .withDatabaseName("grocery")
                .withUsername("grocellery")
                .withPassword("grocellery");
        kafka = new RedpandaContainer(REDPANDA_IMAGE);

        orderDb.start();
        summaryDb.start();
        kafka.start();
        orderDb.followOutput(logConsumer);
        summaryDb.followOutput(logConsumer);
        kafka.followOutput(logConsumer);

        createTopic(KAFKA_TOPIC);
        createTopic(DLT_TOPIC);

        orderCtx = startOrderService();
        summaryCtx = startSummaryService();

        await().atMost(30, TimeUnit.SECONDS).until(() -> isUp(ORDER_BASE));
        await().atMost(30, TimeUnit.SECONDS).until(() -> isUp(SUMMARY_BASE));
    }

    @AfterAll
    static void stopAll() {
        if (summaryCtx != null) summaryCtx.close();
        if (orderCtx != null) orderCtx.close();
        if (kafka != null) kafka.stop();
        if (summaryDb != null) summaryDb.stop();
        if (orderDb != null) orderDb.stop();
    }

    @Test
    void checkoutPublishesEventConsumedBySummaryService() throws Exception {
        String orderToken = login(ORDER_BASE);
        String summaryToken = login(SUMMARY_BASE);

        String idempotencyKey = "e2e-happy-" + UUID.randomUUID();
        String correlationId = "corr-" + UUID.randomUUID();

        ResponseEntity<String> resp = orderHttp(orderToken, HttpMethod.POST, "/api/customer/checkout",
                Map.of("cartId", 1001L), idempotencyKey, correlationId);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode root = MAPPER.readTree(resp.getBody());
        long orderId = root.get("id").asLong();
        double total = root.get("total").asDouble();
        assertThat(orderId).isPositive();
        assertThat(root.get("status").asText()).isNotBlank();
        assertThat(total).isCloseTo(26.25, offset(0.01));

        awaitSummaryContains(summaryToken, orderId);
        CustomerSummaryDTO summary = getSummary(summaryToken);
        assertThat(summary.getOrderCount()).isGreaterThanOrEqualTo(1);
        assertThat(summary.getRecentOrders()).anyMatch(s -> s.getOrderId().equals(orderId));
        assertThat(summary.getTotalSpending()).isGreaterThanOrEqualTo(BigDecimal.valueOf(total));

        assertMetricsContain(orderToken, "outbox_events_published_total", 1.0);
    }

    @Test
    void replayWithSameIdempotencyKeyCreatesSingleOrderAndSummary() throws Exception {
        String orderToken = login(ORDER_BASE);
        String summaryToken = login(SUMMARY_BASE);
        String key = "e2e-idemp-" + UUID.randomUUID();
        String correlationId = "corr-idemp-" + UUID.randomUUID();

        long firstOrderId = checkout(orderToken, 2001, key, correlationId);
        long secondOrderId = checkout(orderToken, 2001, key, correlationId);
        assertThat(secondOrderId).isEqualTo(firstOrderId);

        awaitSummaryContains(summaryToken, firstOrderId);
        CustomerSummaryDTO summary = getSummary(summaryToken);
        long matchCount = summary.getRecentOrders().stream()
                .filter(s -> s.getOrderId().equals(firstOrderId))
                .count();
        assertThat(matchCount).isEqualTo(1);
    }

    @Test
    void duplicateEventDeliveryDoesNotDuplicateSummary() throws Exception {
        String orderToken = login(ORDER_BASE);
        String summaryToken = login(SUMMARY_BASE);
        String key = "e2e-dedup-" + UUID.randomUUID();
        String correlationId = "corr-dedup-" + UUID.randomUUID();

        long orderId = checkout(orderToken, 3001, key, correlationId);
        awaitSummaryContains(summaryToken, orderId);

        String payload = readOutboxPayload(orderId);
        assertThat(payload).isNotBlank();
        duplicatePublish(orderId, payload);

        await().atMost(8, TimeUnit.SECONDS).pollInterval(1, TimeUnit.SECONDS).untilAsserted(() -> {
            CustomerSummaryDTO summary = getSummary(summaryToken);
            long matchCount = summary.getRecentOrders().stream()
                    .filter(s -> s.getOrderId().equals(orderId))
                    .count();
            assertThat(matchCount).isEqualTo(1);
        });

        assertMetricsContain(orderToken, "outbox_events_published_total", 1.0);
    }

    private long checkout(String token, long cartId, String idempotencyKey, String correlationId) throws Exception {
        ResponseEntity<String> resp = orderHttp(token, HttpMethod.POST, "/api/customer/checkout",
                Map.of("cartId", cartId), idempotencyKey, correlationId);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return MAPPER.readTree(resp.getBody()).get("id").asLong();
    }

    private void awaitSummaryContains(String token, long orderId) {
        await().atMost(25, TimeUnit.SECONDS).pollInterval(Duration.ofSeconds(1)).until(() -> {
            try {
                CustomerSummaryDTO dto = getSummary(token);
                return dto != null && dto.getRecentOrders().stream().anyMatch(s -> s.getOrderId().equals(orderId));
            } catch (Exception e) {
                return false;
            }
        });
    }

    private CustomerSummaryDTO getSummary(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<CustomerSummaryDTO> resp = http.exchange(SUMMARY_BASE + "/api/customer/summary",
                HttpMethod.GET, new HttpEntity<>(headers), CustomerSummaryDTO.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        return resp.getBody();
    }

    private ResponseEntity<String> orderHttp(String token, HttpMethod method, String path, Object body,
                                             String idempotencyKey, String correlationId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        if (idempotencyKey != null) headers.set("Idempotency-Key", idempotencyKey);
        if (correlationId != null) headers.set("X-Correlation-Id", correlationId);
        return http.exchange(ORDER_BASE + path, method, new HttpEntity<>(body, headers), String.class);
    }

    private String login(String base) throws Exception {
        Map<String, String> req = Map.of("username", "demo-user", "password", "");
        ResponseEntity<String> resp = http.postForEntity(base + "/auth/login", req, String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        return MAPPER.readTree(resp.getBody()).get("token").asText();
    }

    private String readOutboxPayload(long orderId) {
        DataSource ds = postgresDataSource(orderDb.getJdbcUrl(), orderDb.getUsername(), orderDb.getPassword());
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        return jdbc.queryForObject(
                "SELECT payload FROM order_event_store WHERE aggregate_id = ? AND event_type = 'OrderCreatedEvent' ORDER BY created_at DESC LIMIT 1",
                String.class, orderId);
    }

    private void duplicatePublish(long orderId, String payload) throws Exception {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
            producer.send(new ProducerRecord<>(KAFKA_TOPIC, String.valueOf(orderId), payload)).get(15, TimeUnit.SECONDS);
        }
    }

    private static boolean isUp(String baseUrl) {
        try {
            ResponseEntity<String> resp = http.getForEntity(baseUrl + "/actuator/health", String.class);
            if (resp.getStatusCode().is2xxSuccessful()) {
                JsonNode status = MAPPER.readTree(resp.getBody()).path("status");
                return "UP".equals(status.asText());
            }
        } catch (Exception ignored) {}
        return false;
    }

    private static void assertMetricsContain(String token, String metricName, double expectedValue) {
        await().atMost(15, TimeUnit.SECONDS).untilAsserted(() -> {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            ResponseEntity<String> resp = http.exchange(ORDER_BASE + "/actuator/prometheus", HttpMethod.GET,
                    new HttpEntity<>(headers), String.class);
            String body = resp.getBody();
            assertThat(body).contains(metricName);
            double value = Double.parseDouble(body.lines()
                    .filter(l -> l.startsWith(metricName + " ") || l.startsWith(metricName + "{"))
                    .map(l -> l.substring(l.lastIndexOf(' ') + 1).trim())
                    .findFirst()
                    .orElse("0"));
            assertThat(value).isGreaterThanOrEqualTo(expectedValue);
        });
    }

    private static void createTopic(String topic) throws Exception {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        try (AdminClient admin = AdminClient.create(props)) {
            admin.createTopics(List.of(new NewTopic(topic, 1, (short) 1)))
                    .all().get(30, TimeUnit.SECONDS);
        }
    }

    private static ConfigurableApplicationContext startOrderService() {
        return new SpringApplicationBuilder(OrderServiceApplication.class)
                .sources(OrderSideStubs.class)
                .profiles("docker")
                .web(WebApplicationType.SERVLET)
                .run(
                        "--spring.config.name=order-e2e",
                        "--server.port=" + ORDER_PORT,
                        "--spring.datasource.url=" + orderDb.getJdbcUrl(),
                        "--spring.datasource.username=" + orderDb.getUsername(),
                        "--spring.datasource.password=" + orderDb.getPassword(),
                        "--spring.kafka.bootstrap-servers=" + kafka.getBootstrapServers(),
                        "--security.jwt.issuer-uri=" + ORDER_BASE);
    }

    private static ConfigurableApplicationContext startSummaryService() {
        return new SpringApplicationBuilder(SummaryServiceApplication.class)
                .profiles("docker")
                .web(WebApplicationType.SERVLET)
                .run(
                        "--spring.config.name=summary-e2e",
                        "--server.port=" + SUMMARY_PORT,
                        "--spring.datasource.url=" + summaryDb.getJdbcUrl(),
                        "--spring.datasource.username=" + summaryDb.getUsername(),
                        "--spring.datasource.password=" + summaryDb.getPassword(),
                        "--spring.kafka.bootstrap-servers=" + kafka.getBootstrapServers(),
                        "--security.jwt.issuer-uri=" + SUMMARY_BASE);
    }

    private static DriverManagerDataSource postgresDataSource(String url, String user, String pass) {
        DriverManagerDataSource ds = new DriverManagerDataSource();
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setUrl(url);
        ds.setUsername(user);
        ds.setPassword(pass);
        return ds;
    }

    @Configuration
    static class OrderSideStubs {

        @Bean
        @Primary
        CartClient cartClient() {
            return (cartId, auth) -> new CartSnapshot(cartId, List.of(
                    new CartItemSnapshot(101L, 1L, "Organic Milk", 10.50, 2),
                    new CartItemSnapshot(102L, 2L, "Sourdough Bread", 5.25, 1)));
        }

        @Bean
        @Primary
        ProductClient productClient() {
            return productId -> new ProductSnapshot(productId, "product-" + productId, 9.99, true, 100, null);
        }
    }
}