package com.grocery.microservices.cart.controller;

import com.grocery.microservices.cart.dto.CartDTO;
import com.grocery.microservices.cart.dto.CartItemDTO;
import com.grocery.microservices.cart.dto.CartItemQuantityDTO;
import com.grocery.microservices.cart.service.CartService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/carts")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @PostMapping
    public ResponseEntity<CartDTO> createCart() {
        return ResponseEntity.status(HttpStatus.CREATED).body(cartService.createCart());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CartDTO> getCartById(@PathVariable Long id) {
        return ResponseEntity.ok(cartService.getCartById(id));
    }

    @PostMapping("/{cartId}/items")
    public ResponseEntity<CartDTO> addItemToCart(@PathVariable Long cartId, @Valid @RequestBody CartItemDTO itemDto) {
        return ResponseEntity.ok(cartService.addItem(cartId, itemDto.getProductId(), itemDto.getQuantity()));
    }

    @PatchMapping("/{cartId}/items/{itemId}")
    public ResponseEntity<CartDTO> updateItemQuantity(
            @PathVariable Long cartId,
            @PathVariable Long itemId,
            @Valid @RequestBody CartItemQuantityDTO quantityDto) {
        return ResponseEntity.ok(cartService.updateItemQuantity(cartId, itemId, quantityDto.getQuantity()));
    }

    @DeleteMapping("/{cartId}/items/{itemId}")
    public ResponseEntity<CartDTO> removeItemFromCart(@PathVariable Long cartId, @PathVariable Long itemId) {
        return ResponseEntity.ok(cartService.removeItem(cartId, itemId));
    }
}
