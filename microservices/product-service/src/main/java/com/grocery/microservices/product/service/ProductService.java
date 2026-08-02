package com.grocery.microservices.product.service;

import com.grocery.microservices.product.model.Product;
import com.grocery.microservices.product.repository.ProductRepository;
import com.grocery.microservices.product.exception.ProductNotFoundException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {
    private static final String PRODUCT_LIST_CACHE = "productList";
    private static final String PRODUCT_BY_ID_CACHE = "productById";

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Cacheable(PRODUCT_LIST_CACHE)
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Page<Product> getProducts(Pageable pageable) {
        return productRepository.findAll(pageable);
    }

    @Cacheable(value = PRODUCT_LIST_CACHE, key = "#keyword")
    public List<Product> searchProducts(String keyword) {
        return productRepository.findByNameContainingIgnoreCase(keyword);
    }

    @Cacheable(value = PRODUCT_BY_ID_CACHE, key = "#id")
    public Product getProductById(Long id) {
        return productRepository.findById(id).orElseThrow(() -> new ProductNotFoundException(id));
    }

    @Caching(
            put = @CachePut(value = PRODUCT_BY_ID_CACHE, key = "#result.id"),
            evict = @CacheEvict(value = PRODUCT_LIST_CACHE, allEntries = true, beforeInvocation = true)
    )
    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    @Caching(evict = {
            @CacheEvict(value = PRODUCT_LIST_CACHE, allEntries = true, beforeInvocation = true),
            @CacheEvict(value = PRODUCT_BY_ID_CACHE, key = "#id", beforeInvocation = true)
    })
    public void deleteProduct(Long id) {
        productRepository.findById(id).orElseThrow(() -> new ProductNotFoundException(id));
        productRepository.deleteById(id);
    }
}
