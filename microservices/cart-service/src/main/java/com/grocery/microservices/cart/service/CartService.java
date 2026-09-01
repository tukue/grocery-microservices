package com.grocery.microservices.cart.service;

import com.grocery.microservices.cart.client.CatalogProduct;
import com.grocery.microservices.cart.client.ProductCatalogClient;
import com.grocery.microservices.cart.dto.CartDTO;
import com.grocery.microservices.cart.dto.CartItemDTO;
import com.grocery.microservices.cart.exception.CartItemNotFoundException;
import com.grocery.microservices.cart.exception.CartNotFoundException;
import com.grocery.microservices.cart.exception.CartAccessDeniedException;
import com.grocery.microservices.cart.exception.ProductUnavailableException;
import com.grocery.microservices.cart.exception.InsufficientProductStockException;
import com.grocery.microservices.cart.model.Cart;
import com.grocery.microservices.cart.model.CartItem;
import com.grocery.microservices.cart.repository.CartRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;
import java.util.stream.Collectors;

@Service
public class CartService {
    private static final Logger log = LoggerFactory.getLogger(CartService.class);
    private final CartRepository repo;
    private final ProductCatalogClient productCatalogClient;

    public CartService(CartRepository repo, ProductCatalogClient productCatalogClient) {
        this.repo = repo;
        this.productCatalogClient = productCatalogClient;
    }

    @Transactional
    @Retryable(retryFor = { SQLException.class }, maxAttempts = 3, backoff = @Backoff(delay = 2000))
    public CartDTO createCart(String userId) {
        Cart newCart = new Cart();
        newCart.setUserId(userId);
        Cart cart = repo.save(newCart);
        log.info("EVENT=CART_CREATED CART_ID={}", cart.getId());
        return toDTO(cart);
    }

    public CartDTO getCartById(Long id, String userId) {
        Cart cart = repo.findById(id).orElseThrow(() -> new CartNotFoundException(id));
        verifyOwner(cart, userId);
        return toDTO(cart);
    }

    @Transactional
    @Retryable(retryFor = { SQLException.class }, maxAttempts = 3, backoff = @Backoff(delay = 2000))
    public CartDTO addItem(Long cartId, Long productId, int quantity, String userId) {
        Cart cart = repo.findById(cartId).orElseThrow(() -> new CartNotFoundException(cartId));
        verifyOwner(cart, userId);
        CatalogProduct product = productCatalogClient.getProduct(productId);
        if (!product.available()) {
            throw new ProductUnavailableException(productId);
        }
        int requestedQuantity = cart.getItems().stream()
                .filter(item -> productId.equals(item.getProductId()))
                .mapToInt(CartItem::getQuantity)
                .sum() + quantity;
        if (product.stockQuantity() < requestedQuantity) {
            throw new InsufficientProductStockException(productId, requestedQuantity, product.stockQuantity());
        }
        CartItem item = new CartItem();
        item.setProductId(product.id());
        item.setProductName(product.name());
        item.setPrice(product.price());
        item.setQuantity(quantity);
        cart.getItems().add(item);
        Cart updatedCart = repo.save(cart);
        log.info("EVENT=ITEM_ADDED_TO_CART CART_ID={} PRODUCT={} QTY={}", 
            cartId, item.getProductName(), item.getQuantity());
        return toDTO(updatedCart);
    }

    @Transactional
    @Retryable(retryFor = { SQLException.class }, maxAttempts = 3, backoff = @Backoff(delay = 2000))
    public CartDTO removeItem(Long cartId, Long itemId, String userId) {
        Cart cart = repo.findById(cartId).orElseThrow(() -> new CartNotFoundException(cartId));
        verifyOwner(cart, userId);
        CartItem item = getCartItem(cart, cartId, itemId);
        cart.getItems().remove(item);
        Cart updatedCart = repo.save(cart);
        log.info("EVENT=ITEM_REMOVED_FROM_CART CART_ID={} ITEM_ID={}", cartId, itemId);
        return toDTO(updatedCart);
    }

    @Transactional
    @Retryable(retryFor = { SQLException.class }, maxAttempts = 3, backoff = @Backoff(delay = 2000))
    public CartDTO updateItemQuantity(Long cartId, Long itemId, int quantity, String userId) {
        Cart cart = repo.findById(cartId).orElseThrow(() -> new CartNotFoundException(cartId));
        verifyOwner(cart, userId);
        CartItem item = getCartItem(cart, cartId, itemId);
        item.setQuantity(quantity);
        Cart updatedCart = repo.save(cart);
        log.info("EVENT=CART_ITEM_QUANTITY_UPDATED CART_ID={} ITEM_ID={} QUANTITY={}", cartId, itemId, quantity);
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
        dto.setProductId(item.getProductId());
        dto.setProductName(item.getProductName());
        dto.setPrice(item.getPrice());
        dto.setQuantity(item.getQuantity());
        return dto;
    }

    private CartItem getCartItem(Cart cart, Long cartId, Long itemId) {
        return cart.getItems().stream()
                .filter(item -> itemId.equals(item.getId()))
                .findFirst()
                .orElseThrow(() -> new CartItemNotFoundException(cartId, itemId));
    }

    private void verifyOwner(Cart cart, String userId) {
        if (!userId.equals(cart.getUserId())) {
            throw new CartAccessDeniedException(cart.getId());
        }
    }

    @Transactional
    public Cart saveCart(Cart cart) {
        return repo.save(cart);
    }
}
