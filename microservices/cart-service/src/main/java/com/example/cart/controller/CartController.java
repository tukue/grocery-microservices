package com.example.cart.controller;

import com.example.cart.dto.CartDTO;
import com.example.cart.model.Cart;
import com.example.cart.model.CartItem;
import com.example.cart.service.CartService;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/carts")
public class CartController {
    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @PostMapping
    public CartDTO createCart() {
        Cart cart = cartService.createCart();
        return convertToDto(cart);
    }

    @GetMapping("/{id}")
    public CartDTO getCart(@PathVariable Long id) {
        Cart cart = cartService.getCart(id);
        return convertToDto(cart);
    }

    @PostMapping("/{id}/items")
    public CartDTO addItem(@PathVariable Long id, @RequestBody CartItem item) {
        Cart cart = cartService.addItem(id, item);
        return convertToDto(cart);
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public CartDTO removeItem(@PathVariable Long id, @PathVariable Long itemId) {
        Cart cart = cartService.removeItem(id, itemId);
        return convertToDto(cart);
    }

    private CartDTO convertToDto(Cart cart) {
        CartDTO cartDto = new CartDTO();
        BeanUtils.copyProperties(cart, cartDto);
        // Additional mapping for items if needed
        return cartDto;
    }
} 