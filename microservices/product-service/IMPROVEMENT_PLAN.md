# Product Service Improvement Plan (KISS)

Focus: Performance and Data Quality.

## 1. Catalog Performance
- Implement simple In-Memory caching (using Spring's `@Cacheable`) for the product list to reduce DB hits for static data.

## 2. Search Basics
- Implement basic keyword filtering using standard JPA `Containing` methods—simple, effective, and requires no extra infrastructure (like Elasticsearch).

## 3. Image Strategy
- Use placeholder URLs or stylized SVG icons for product images to keep the demo repository "visual" without needing an S3 bucket setup for every developer.

## 4. Data Seeding
- Maintain a clean `import.sql` or Liquibase script to ensure the catalog is always populated with high-quality demo data.
