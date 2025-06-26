package com.example.summary.model;

import jakarta.persistence.*;

@Entity
public class Summary {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String details;
    
    // Add fields for orderId, date, etc. as needed

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
} 