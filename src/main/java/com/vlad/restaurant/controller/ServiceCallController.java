package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.ServiceCallRequest;
import com.vlad.restaurant.dto.ServiceCallResponse;
import com.vlad.restaurant.security.GuestPrincipal;
import com.vlad.restaurant.service.ServiceCallService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/service-calls")
@RequiredArgsConstructor
public class ServiceCallController {

    private final ServiceCallService service;

    // ---------- Гість ----------

    // Кнопки "Викликати офіціанта" / "Принести рахунок"
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('GUEST')")
    public ServiceCallResponse create(@AuthenticationPrincipal GuestPrincipal guest,
                                      @Valid @RequestBody ServiceCallRequest request) {
        return service.create(guest.tableId(), request);
    }

    // Відкриті виклики столу гостя (щоб кнопка показувала стан "офіціант іде")
    @GetMapping("/my")
    @PreAuthorize("hasRole('GUEST')")
    public List<ServiceCallResponse> my(@AuthenticationPrincipal GuestPrincipal guest) {
        return service.getOpenForTable(guest.tableId());
    }


    @DeleteMapping("/my")
    @PreAuthorize("hasRole('GUEST')")
    public void cancelMyCalls(@AuthenticationPrincipal GuestPrincipal guest) {
        service.cancelMyCalls(guest.tableId());
    }

    // ---------- Персонал ----------


    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('WAITER', 'ADMIN')")
    public List<ServiceCallResponse> active() {
        return service.getOpen();
    }

    @PatchMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('WAITER', 'ADMIN')")
    public ServiceCallResponse resolve(@PathVariable UUID id) {
        return service.resolve(id);
    }
}
