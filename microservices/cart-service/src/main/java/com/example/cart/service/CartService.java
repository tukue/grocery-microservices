package com.example.cart.service;

import com.example.cart.dto.CartDTO;
import com.example.cart.dto.CartItemDTO;
import com.example.cart.exception.CartNotFoundException;
import com.example.cart.model.Cart;
import com.example.cart.model.CartItem;
import com.example.cart.repository.CartRepository;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
public class CartService {
    private final CartRepository repo;
    public CartService(CartRepository repo) { this.repo = repo; }

    public CartDTO createCart() {
        Cart cart = repo.save(new Cart());
        return toDTO(cart);
    }

    public CartDTO getCartById(Long id) {
        Cart cart = repo.findById(id).orElseThrow(() -> new CartNotFoundException(id));
        return toDTO(cart);
    }

    public CartDTO addItem(Long cartId, CartItem item) {
        Cart cart = repo.findById(cartId).orElseThrow(() -> new CartNotFoundException(cartId));
        cart.getItems().add(item);
        Cart updatedCart = repo.save(cart);
        return toDTO(updatedCart);
    }

    public CartDTO removeItem(Long cartId, Long itemId) {
        Cart cart = repo.findById(cartId).orElseThrow(() -> new CartNotFoundException(cartId));
        cart.getItems().removeIf(i -> i.getId().equals(itemId));
        Cart updatedCart = repo.save(cart);
        return toDTO(updatedCart);
    }

    private CartDTO toDTO(Cart cart) {
        CartDTO dto = new CartDTO();
        dto.setId(cart.getId());
        if (cart.getItems() != null) {
            dto.setItems(cart.getItems().stream().map(this::toDTO).collect(Collectors.toList()));
        }
        return dto;
    }

    private CartItemDTO toDTO(CartItem item) {
        CartItemDTO dto = new CartItemDTO();
        dto.setId(item.getId());
        dto.setProductName(item.getProductName());
        dto.setPrice(item.getPrice());
        dto.setQuantity(item.getQuantity());
        return dto;
    }

    public Cart saveCart(Cart cart) {
        return repo.save(cart);
    }
} 