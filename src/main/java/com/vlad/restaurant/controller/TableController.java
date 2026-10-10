package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.TableCreateRequest;
import com.vlad.restaurant.dto.TableResponse;
import com.vlad.restaurant.service.TableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

// Керування столами та їхніми QR-кодами - тільки для адміністратора
@RestController
@RequestMapping("/api/v1/tables")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class TableController {

    private final TableService tableService;

    @GetMapping
    public List<TableResponse> getAll() {
        return tableService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TableResponse create(@Valid @RequestBody TableCreateRequest request) {
        return tableService.create(request);
    }

    @PostMapping("/{id}/regenerate-qr")
    public TableResponse regenerateQr(@PathVariable UUID id) {
        return tableService.regenerateQr(id);
    }

    // PNG для друку на наліпку. size у пікселях (128..2048).
    // Захищено JWT, тому фронтенд адміна завантажує його через fetch -> blob.
    @GetMapping(value = "/{id}/qr.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> qrImage(@PathVariable UUID id, @RequestParam(defaultValue = "512") int size) {
        int safeSize = Math.max(128, Math.min(size, 2048));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore()) // після regenerate-qr старе зображення недійсне
                .contentType(MediaType.IMAGE_PNG)
                .body(tableService.generateQrPng(id, safeSize));
    }
}
