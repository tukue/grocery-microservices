package com.grocery.microservices.product.controller;

import com.grocery.microservices.product.config.TestJwtSupport;
import com.grocery.microservices.product.config.TestSecurityConfig;
import com.grocery.microservices.product.dto.ProductDTO;
import com.grocery.microservices.product.model.Product;
import com.grocery.microservices.product.service.ProductService;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;

import org.springframework.cache.CacheManager;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

@ActiveProfiles("test")
@WebMvcTest(ProductController.class)
@Import(TestSecurityConfig.class)
public class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductService productService;

    @MockitoBean
    private CacheManager cacheManager;

    @Autowired
    private ObjectMapper objectMapper;

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    @Test
    public void testGetAllProductsIsPublic() throws Exception {
        Product product = new Product();
        product.setId(1L);
        product.setName("Test Product");
        product.setDescription("A test product.");
        product.setPrice(10.0);
        product.setCurrency("SEK");

        when(productService.getAllProducts()).thenReturn(Collections.singletonList(product));

        mockMvc.perform(get("/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Test Product"));
    }

    @Test
    public void testGetProductsPage() throws Exception {
        Product product = new Product();
        product.setId(1L);
        product.setName("Test Product");
        product.setDescription("A test product.");
        product.setPrice(10.0);
        product.setCurrency("SEK");

        PageRequest expectedPageRequest = PageRequest.of(0, 20, Sort.by(Sort.Direction.ASC, "name"));
        when(productService.getProducts(expectedPageRequest)).thenReturn(new PageImpl<>(List.of(product), expectedPageRequest, 1));

        mockMvc.perform(get("/products")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Test Product"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    public void testGetProductsPageFallsBackForUnsupportedSortField() throws Exception {
        Product product = new Product();
        product.setId(1L);
        product.setName("Test Product");
        product.setDescription("A test product.");
        product.setPrice(10.0);
        product.setCurrency("SEK");

        when(productService.getProducts(argThat(pageable ->
                pageable != null
                        && pageable.getPageNumber() == 0
                        && pageable.getPageSize() == 20
                        && pageable.getSort().getOrderFor("name") != null
                        && pageable.getSort().getOrderFor("unsupported") == null)))
                .thenReturn(new PageImpl<>(List.of(product), PageRequest.of(0, 20, Sort.by("name")), 1));

        mockMvc.perform(get("/products")
                        .param("page", "0")
                        .param("size", "20")
                        .param("sort", "unsupported"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Test Product"));
    }

    @Test
    public void testGetProductsPageRejectsOversizedRequest() throws Exception {
        mockMvc.perform(get("/products")
                        .param("page", "0")
                        .param("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation Failed"));
    }

    @Test
    public void testSearchProducts() throws Exception {
        Product product = new Product();
        product.setId(1L);
        product.setName("Apple");
        product.setDescription("Crisp apples.");
        product.setPrice(0.99);
        product.setCurrency("SEK");

        when(productService.searchProducts("Apple")).thenReturn(Collections.singletonList(product));

        mockMvc.perform(get("/products/search").param("name", "Apple"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Apple"));
    }

    @Test
    public void testCreateProductRequiresAdminScope() throws Exception {
        ProductDTO productDTO = new ProductDTO();
        productDTO.setName("New Product");
        productDTO.setDescription("A new test product.");
        productDTO.setPrice(20.0);
        productDTO.setCurrency("SEK");

        Product savedProduct = new Product();
        savedProduct.setId(1L);
        savedProduct.setName("New Product");
        savedProduct.setDescription("A new test product.");
        savedProduct.setPrice(20.0);
        savedProduct.setCurrency("SEK");

        when(productService.saveProduct(any(Product.class))).thenReturn(savedProduct);

        mockMvc.perform(post("/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.validToken("admin-1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("New Product"))
                .andExpect(jsonPath("$.description").value("A new test product."))
                .andExpect(jsonPath("$.currency").value("SEK"));
    }

    @Test
    public void rejectsCreateProductWithoutToken() throws Exception {
        ProductDTO productDTO = new ProductDTO();
        productDTO.setName("New Product");
        productDTO.setDescription("A new test product.");
        productDTO.setPrice(20.0);
        productDTO.setCurrency("SEK");

        mockMvc.perform(post("/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(productService);
    }

    @Test
    public void rejectsCreateProductWithoutAdminScope() throws Exception {
        ProductDTO productDTO = new ProductDTO();
        productDTO.setName("New Product");
        productDTO.setDescription("A new test product.");
        productDTO.setPrice(20.0);
        productDTO.setCurrency("SEK");

        mockMvc.perform(post("/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.tokenWithScopes("customer-1", "cart:read")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(productService);
    }

    @Test
    public void rejectsInvalidUpdateProduct() throws Exception {
        ProductDTO productDTO = new ProductDTO();
        productDTO.setName("New Product");
        productDTO.setDescription("A new test product.");
        productDTO.setPrice(20.0);
        productDTO.setCurrency("SEK");
        productDTO.setStockQuantity(-1);

        mockMvc.perform(put("/products/1")
                        .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.validToken("admin-1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(MockMvcResultMatchers.status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.stockQuantity").value("Stock quantity must not be negative"));

        verifyNoInteractions(productService);
    }

    @Test
    public void exposesProductAvailability() throws Exception {
        Product product = new Product();
        product.setId(1L);
        product.setName("Unavailable Product");
        product.setDescription("Currently unavailable.");
        product.setPrice(10.0);
        product.setCurrency("SEK");
        product.setAvailable(false);
        product.setStockQuantity(4);
        when(productService.getProductById(1L)).thenReturn(product);

        mockMvc.perform(get("/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.stockQuantity").value(4))
                .andExpect(jsonPath("$.description").value("Currently unavailable."))
                .andExpect(jsonPath("$.currency").value("SEK"));
    }

    @Test
    public void rejectsNegativeStockQuantity() throws Exception {
        ProductDTO productDTO = new ProductDTO();
        productDTO.setName("New Product");
        productDTO.setDescription("A new test product.");
        productDTO.setPrice(20.0);
        productDTO.setCurrency("SEK");
        productDTO.setStockQuantity(-1);

        mockMvc.perform(post("/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.validToken("admin-1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.stockQuantity").value("Stock quantity must not be negative"));
    }

    @Test
    public void rejectsInvalidCurrency() throws Exception {
        ProductDTO productDTO = new ProductDTO();
        productDTO.setName("New Product");
        productDTO.setDescription("A new test product.");
        productDTO.setPrice(20.0);
        productDTO.setCurrency("sek");

        mockMvc.perform(post("/products")
                        .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.validToken("admin-1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.currency")
                        .value("Product currency must be a three-letter ISO 4217 code"));
    }
}
