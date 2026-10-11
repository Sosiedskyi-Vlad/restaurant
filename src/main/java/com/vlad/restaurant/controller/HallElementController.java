package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.HallElementDto;
import com.vlad.restaurant.service.HallElementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hall-elements")
@RequiredArgsConstructor
public class HallElementController {

    private final HallElementService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAITER')")
    public List<HallElementDto> getAll(@RequestParam(required = false) String zone) {
        return service.getAll(zone);
    }

    @PutMapping("/zone/{zone}")
    @PreAuthorize("hasRole('ADMIN')")
    public List<HallElementDto> saveBatch(@PathVariable String zone, @RequestBody List<HallElementDto> elements) {
        return service.saveBatch(zone, elements);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
