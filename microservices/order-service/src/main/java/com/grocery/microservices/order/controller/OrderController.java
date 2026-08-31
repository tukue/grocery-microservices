package com.grocery.microservices.order.controller;

import com.grocery.microservices.order.dto.OrderDTO;
import com.grocery.microservices.order.dto.CheckoutRequest;
import com.grocery.microservices.order.dto.OrderLineDTO;
import com.grocery.microservices.order.model.Order;
import com.grocery.microservices.order.model.OrderLine;
import com.grocery.microservices.order.model.OrderStatus;
import com.grocery.microservices.order.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Collections;

@RestController
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/checkout")
    public ResponseEntity<OrderDTO> checkout(@Valid @RequestBody CheckoutRequest checkoutRequest,
                                             Authentication authentication,
                                             HttpServletRequest request) {
        Order createdOrder = orderService.checkout(
                checkoutRequest.getCartId(),
                authentication.getName(),
                request.getHeader("Authorization"));
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(createdOrder));
    }

    @GetMapping
    public List<OrderDTO> getOrders(Authentication authentication) {
        return orderService.getOrdersForUser(authentication.getName()).stream().map(this::convertToDto).toList();
    }

    @GetMapping("/{id}")
    public OrderDTO getOrder(@PathVariable Long id, Authentication authentication) {
        Order order = orderService.getOrder(id, authentication.getName());
        return convertToDto(order);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderDTO> updateStatus(@PathVariable Long id, @RequestParam OrderStatus status,
                                                  Authentication authentication) {
        Order updatedOrder = orderService.updateOrderStatus(id, status, authentication.getName());
        return ResponseEntity.ok(convertToDto(updatedOrder));
    }

    private OrderDTO convertToDto(Order order) {
        OrderDTO orderDto = new OrderDTO();
        orderDto.setId(order.getId());
        orderDto.setUserId(order.getUserId());
        orderDto.setCartId(order.getCartId());
        orderDto.setStatus(order.getStatus());
        orderDto.setOrderDate(order.getOrderDate());
        orderDto.setTotal(order.getTotal());
        orderDto.setOrderLines(toOrderLineDtos(order.getOrderLines()));
        return orderDto;
    }

    private List<OrderLineDTO> toOrderLineDtos(List<OrderLine> orderLines) {
        if (orderLines == null) {
            return Collections.emptyList();
        }
        return orderLines.stream().map(orderLine -> {
            OrderLineDTO dto = new OrderLineDTO();
            dto.setProductId(orderLine.getProductId());
            dto.setProductName(orderLine.getProductName());
            dto.setUnitPrice(orderLine.getUnitPrice());
            dto.setQuantity(orderLine.getQuantity());
            dto.setLineTotal(orderLine.getLineTotal());
            return dto;
        }).toList();
    }
}
