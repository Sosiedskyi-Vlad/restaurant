package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.CheckoutRequest;
import com.vlad.restaurant.dto.CheckoutResponse;
import com.vlad.restaurant.dto.PaymentResponse;
import com.vlad.restaurant.security.GuestPrincipal;
import com.vlad.restaurant.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // Гість: почати оплату свого замовлення
    @PostMapping("/checkout")
    @PreAuthorize("hasRole('GUEST')")
    public CheckoutResponse checkout(@AuthenticationPrincipal GuestPrincipal guest,
                                     @Valid @RequestBody CheckoutRequest request) {
        return paymentService.checkout(guest.tableId(), request);
    }

    // Гість: перевірити результат після повернення зі сторінки LiqPay
    @PostMapping("/{id}/sync")
    @PreAuthorize("hasRole('GUEST')")
    public PaymentResponse sync(@AuthenticationPrincipal GuestPrincipal guest, @PathVariable UUID id) {
        return paymentService.sync(guest.tableId(), id);
    }

    // Викликає LiqPay (без JWT, захист - підпис SHA-1). Дозволено в SecurityConfig.
    @PostMapping(value = "/liqpay/callback", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> liqPayCallback(@RequestParam String data, @RequestParam String signature) {
        paymentService.handleCallback(data, signature);
        return ResponseEntity.ok().build();
    }
}
