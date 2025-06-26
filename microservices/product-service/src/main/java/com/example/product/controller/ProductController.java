package com.example.product.controller;

import com.example.product.dto.ProductDTO;
import com.example.product.model.Product;
import com.example.product.service.ProductService;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/products")
public class ProductController {

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

    @GetMapping("/{id}")
    public ProductDTO getProductById(@PathVariable Long id) {
        Product product = productService.getProductById(id);
        return convertToDto(product);
    }

    @PostMapping
    public ProductDTO createProduct(@RequestBody ProductDTO productDto) {
        Product product = convertToEntity(productDto);
        Product savedProduct = productService.saveProduct(product);
        return convertToDto(savedProduct);
    }

    @PutMapping("/{id}")
    public ProductDTO updateProduct(@PathVariable Long id, @RequestBody ProductDTO productDto) {
        Product product = convertToEntity(productDto);
        product.setId(id);
        Product updatedProduct = productService.saveProduct(product);
        return convertToDto(updatedProduct);
    }

    @DeleteMapping("/{id}")
    public void deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
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
} 