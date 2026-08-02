package com.grocery.microservices.product.controller;

import com.grocery.microservices.product.dto.ProductDTO;
import com.grocery.microservices.product.model.Product;
import com.grocery.microservices.product.service.ProductService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.Set;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/products")
@Validated
public class ProductController {
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("id", "name", "price");

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public List<ProductDTO> getAllProducts() {
        return productService.getAllProducts().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @GetMapping(params = {"page", "size"})
    public Page<ProductDTO> getProductsPage(
            @RequestParam @Min(0) int page,
            @RequestParam @Min(1) @Max(MAX_PAGE_SIZE) int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc") String direction) {
        PageRequest pageRequest = createPageRequest(page, size, sort, direction);
        return productService.getProducts(pageRequest).map(this::convertToDto);
    }

    @GetMapping("/search")
    public List<ProductDTO> searchProducts(@RequestParam String name) {
        return productService.searchProducts(name).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ProductDTO getProductById(@PathVariable Long id) {
        Product product = productService.getProductById(id);
        return convertToDto(product);
    }

    @PostMapping
    public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody ProductDTO productDTO) {
        Product product = convertToEntity(productDTO);
        Product savedProduct = productService.saveProduct(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(savedProduct));
    }

    @PutMapping("/{id}")
    public ProductDTO updateProduct(@PathVariable Long id, @Valid @RequestBody ProductDTO productDTO) {
        Product product = convertToEntity(productDTO);
        product.setId(id);
        Product updatedProduct = productService.saveProduct(product);
        return convertToDto(updatedProduct);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    private ProductDTO convertToDto(Product product) {
        ProductDTO productDto = new ProductDTO();
        BeanUtils.copyProperties(product, productDto);
        return productDto;
    }

    private Product convertToEntity(ProductDTO productDto) {
        Product product = new Product();
        BeanUtils.copyProperties(productDto, product);
        return product;
    }

    private PageRequest createPageRequest(int page, int size, String sort, String direction) {
        String sortField = ALLOWED_SORT_FIELDS.contains(sort) ? sort : "name";
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return PageRequest.of(page, size, Sort.by(sortDirection, sortField));
    }
}
