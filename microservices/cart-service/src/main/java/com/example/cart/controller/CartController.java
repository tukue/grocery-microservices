package com.example.cart.controller;

import com.example.cart.model.Cart;
import com.example.cart.model.CartItem;
import com.example.cart.service.CartService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/carts")
public class CartController {
    private final CartService service;
    public CartController(CartService service) { this.service = service; }

    @PostMapping
    public Cart createCart() { return service.createCart(); }

    @GetMapping("/{id}")
    public Cart getCart(@PathVariable Long id) { return service.getCart(id); }

    @PostMapping("/{id}/items")
    public Cart addItem(@PathVariable Long id, @RequestBody CartItem item) {
        return service.addItem(id, item);
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public Cart removeItem(@PathVariable Long id, @PathVariable Long itemId) {
        return service.removeItem(id, itemId);
    }
} 