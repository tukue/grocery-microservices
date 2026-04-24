package com.example.product.service;

import com.example.product.model.Product;
import com.example.product.repository.ProductRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {
    private static final String PRODUCT_CACHE = "products";

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Cacheable(PRODUCT_CACHE)
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Cacheable(value = PRODUCT_CACHE, key = "#id")
    public Product getProductById(Long id) {
        return productRepository.findById(id).orElseThrow(() -> new RuntimeException("Product not found"));
    }

    @CachePut(value = PRODUCT_CACHE, key = "#result.id")
    @CacheEvict(value = PRODUCT_CACHE, allEntries = true, beforeInvocation = true)
    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    @Caching(evict = {
            @CacheEvict(value = PRODUCT_CACHE, allEntries = true, beforeInvocation = true),
            @CacheEvict(value = PRODUCT_CACHE, key = "#id", beforeInvocation = true)
    })
    public void deleteProduct(Long id) {
        productRepository.findById(id).orElseThrow(() -> new RuntimeException("Product not found"));
        productRepository.deleteById(id);
    }
}
