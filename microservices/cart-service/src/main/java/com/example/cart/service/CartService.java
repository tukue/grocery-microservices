package com.example.cart.service;

import com.example.cart.model.Cart;
import com.example.cart.model.CartItem;
import com.example.cart.repository.CartRepository;
import org.springframework.stereotype.Service;

@Service
public class CartService {
    private final CartRepository repo;
    public CartService(CartRepository repo) { this.repo = repo; }

    public Cart createCart() { return repo.save(new Cart()); }
    public Cart getCart(Long id) { return repo.findById(id).orElseThrow(); }
    public Cart addItem(Long cartId, CartItem item) {
        Cart cart = getCart(cartId);
        cart.getItems().add(item);
        return repo.save(cart);
    }
    public Cart removeItem(Long cartId, Long itemId) {
        Cart cart = getCart(cartId);
        cart.getItems().removeIf(i -> i.getId().equals(itemId));
        return repo.save(cart);
    }
} 