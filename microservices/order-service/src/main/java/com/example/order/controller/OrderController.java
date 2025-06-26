package com.example.order.controller;

import com.example.order.dto.OrderDTO;
import com.example.order.model.Order;
import com.example.order.service.OrderService;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public OrderDTO createOrder(@Valid @RequestBody OrderDTO orderDto) {
        Order order = convertToEntity(orderDto);
        Order createdOrder = orderService.createOrder(order);
        return convertToDto(createdOrder);
    }

    @GetMapping("/{id}")
    public OrderDTO getOrder(@PathVariable Long id) {
        Order order = orderService.getOrder(id);
        return convertToDto(order);
    }

    private OrderDTO convertToDto(Order order) {
        OrderDTO orderDto = new OrderDTO();
        BeanUtils.copyProperties(order, orderDto);
        return orderDto;
    }

    private Order convertToEntity(OrderDTO orderDto) {
        Order order = new Order();
        BeanUtils.copyProperties(orderDto, order);
        return order;
    }
} 