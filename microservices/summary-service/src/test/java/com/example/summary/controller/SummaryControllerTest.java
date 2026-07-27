package com.example.summary.controller;

import com.example.summary.dto.SummaryDTO;
import com.example.summary.model.Summary;
import com.example.summary.service.SummaryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@WebMvcTest(SummaryController.class)
@Import({com.example.summary.config.SecurityConfig.class, SummaryControllerTest.TestSecurityConfig.class})
public class SummaryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SummaryService summaryService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testCreateSummaryMapsApiFieldsToEntityFields() throws Exception {
        SummaryDTO request = new SummaryDTO();
        request.setOrderId(42L);
        request.setItems(List.of("Apple", "Banana"));
        request.setTotal(12.50);

        Summary saved = new Summary();
        saved.setId(1L);
        saved.setOrderId(42L);
        saved.setDetails("Apple, Banana");
        saved.setItemCount(2);
        saved.setTotalAmount(new BigDecimal("12.5"));

        when(summaryService.createSummary(any(Summary.class))).thenReturn(saved);

        mockMvc.perform(post("/summaries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.orderId").value(42L))
                .andExpect(jsonPath("$.items[0]").value("Apple"))
                .andExpect(jsonPath("$.total").value(12.5));
    }

    @TestConfiguration
    @Profile("test")
    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf().disable().authorizeHttpRequests().anyRequest().permitAll();
            return http.build();
        }
        @Bean
        public com.example.summary.config.JwtUtil jwtUtil() {
            return new com.example.summary.config.JwtUtil();
        }
    }
}
