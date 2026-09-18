package com.grocery.microservices.product.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ProductDTO {
    private Long id;

    @NotBlank(message = "Product name must not be blank")
    private String name;

    @NotBlank(message = "Product description must not be blank")
    @Size(max = 2000, message = "Product description must not exceed 2000 characters")
    private String description;

    @Positive(message = "Product price must be positive")
    private double price;

    @NotBlank(message = "Product currency must not be blank")
    @Pattern(regexp = "[A-Z]{3}", message = "Product currency must be a three-letter ISO 4217 code")
    private String currency;

    @NotNull(message = "Product availability must be specified")
    private Boolean available = true;

    @PositiveOrZero(message = "Stock quantity must not be negative")
    private int stockQuantity;

    private String imageUrl;

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public Boolean getAvailable() {
        return available;
    }

    public void setAvailable(Boolean available) {
        this.available = available;
    }
    public int getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(int stockQuantity) { this.stockQuantity = stockQuantity; }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
