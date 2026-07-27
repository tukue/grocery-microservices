package com.example.product;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.CommandLineRunner;
import com.example.product.model.Product;
import com.example.product.repository.ProductRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.cache.annotation.EnableCaching;

import java.util.List;

@SpringBootApplication
@EnableCaching
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
                repository.saveAll(List.of(
                        product("Apple", 0.99),
                        product("Banana", 0.59),
                        product("Carrot", 0.39),
                        product("Dairy Milk", 1.49),
                        product("Eggs", 2.99)
                ));
            }
        };
    }

    private Product product(String name, double price) {
        Product product = new Product();
        product.setName(name);
        product.setPrice(price);
        return product;
    }
}
