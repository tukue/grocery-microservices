package com.grocery.microservices.product;

import com.grocery.microservices.product.model.Product;
import com.grocery.microservices.product.repository.ProductRepository;
import com.grocery.microservices.product.service.ProductService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ActiveProfiles("test")
@SpringBootTest(classes = ProductServiceApplication.class)
class ProductServiceCachingTest {
    private static final String PRODUCT_LIST_CACHE = "productList";
    private static final String PRODUCT_BY_ID_CACHE = "productById";

    @MockBean
    private ProductRepository productRepository;

    @Autowired
    private ProductService productService;

    @Autowired
    private CacheManager cacheManager;

    @AfterEach
    void clearCache() {
        clearCache(PRODUCT_LIST_CACHE);
        clearCache(PRODUCT_BY_ID_CACHE);
    }

    @Test
    void cachesProductListUntilCatalogChanges() {
        Product apple = buildProduct(1L, "Apple", 0.99);
        when(productRepository.findAll()).thenReturn(List.of(apple));

        List<Product> firstCall = productService.getAllProducts();
        List<Product> secondCall = productService.getAllProducts();

        assertEquals(1, firstCall.size());
        assertEquals(firstCall, secondCall);
        verify(productRepository, times(1)).findAll();

        Product banana = buildProduct(2L, "Banana", 1.29);
        when(productRepository.save(banana)).thenReturn(banana);
        productService.saveProduct(banana);

        when(productRepository.findAll()).thenReturn(List.of(apple, banana));
        List<Product> refreshedCatalog = productService.getAllProducts();

        assertEquals(2, refreshedCatalog.size());
        verify(productRepository, times(2)).findAll();
    }

    @Test
    void cachesProductByIdAndEvictsItOnDelete() {
        Product apple = buildProduct(1L, "Apple", 0.99);
        when(productRepository.findById(1L)).thenReturn(Optional.of(apple));

        Product firstCall = productService.getProductById(1L);
        Product secondCall = productService.getProductById(1L);

        assertEquals("Apple", firstCall.getName());
        assertEquals(firstCall, secondCall);
        verify(productRepository, times(1)).findById(1L);

        productService.deleteProduct(1L);
        verify(productRepository, times(1)).deleteById(1L);

        when(productRepository.findById(1L)).thenReturn(Optional.of(apple));
        Product afterDelete = productService.getProductById(1L);

        assertNotNull(afterDelete);
        verify(productRepository, times(3)).findById(1L);
    }

    @Test
    void saveProductEvictsCachedProductById() {
        Product apple = buildProduct(1L, "Apple", 0.99);
        when(productRepository.findById(1L)).thenReturn(Optional.of(apple));
        when(productRepository.save(apple)).thenReturn(apple);

        Product firstCall = productService.getProductById(1L);
        Product secondCall = productService.getProductById(1L);

        assertEquals(firstCall, secondCall);
        verify(productRepository, times(1)).findById(1L);

        Product saved = productService.saveProduct(apple);
        assertEquals(apple.getId(), saved.getId());

        Product afterSave = productService.getProductById(1L);

        assertNotNull(afterSave);
        verify(productRepository, times(1)).findById(1L);

        Cache itemCache = cacheManager.getCache(PRODUCT_BY_ID_CACHE);
        assertNotNull(itemCache);
        assertNotNull(itemCache.get(apple.getId()));
        assertEquals(saved, itemCache.get(apple.getId()).get());
    }

    private void clearCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
        }
    }

    private Product buildProduct(Long id, String name, double price) {
        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setPrice(price);
        return product;
    }
}
