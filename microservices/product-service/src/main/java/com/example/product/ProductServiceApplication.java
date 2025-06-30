package com.example.product;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.CommandLineRunner;
import com.example.product.model.Product;
import com.example.product.repository.ProductRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;

@SpringBootApplication
public class ProductServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProductServiceApplication.class, args);
    }

    @Bean
    @Profile("!test")
    @ConditionalOnBean(ProductRepository.class)
    public CommandLineRunner loadData(ProductRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                repository.save(new Product() {{ setName("Apple"); setPrice(0.99); }});
                repository.save(new Product() {{ setName("Banana"); setPrice(0.59); }});
                repository.save(new Product() {{ setName("Carrot"); setPrice(0.39); }});
                repository.save(new Product() {{ setName("Dairy Milk"); setPrice(1.49); }});
                repository.save(new Product() {{ setName("Eggs"); setPrice(2.99); }});
            }
        };
    }
} 