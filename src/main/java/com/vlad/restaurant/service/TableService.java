package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.TableCreateRequest;
import com.vlad.restaurant.dto.TableResponse;
import com.vlad.restaurant.dto.TablePositionUpdateRequest;
import com.vlad.restaurant.entity.RestaurantTable;
import com.vlad.restaurant.exception.BadRequestException;
import com.vlad.restaurant.exception.ResourceNotFoundException;
import com.vlad.restaurant.repository.RestaurantTableRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Map;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TableService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RestaurantTableRepository repository;

    // Адреса гостьового фронтенду: саме її відкриє телефон після сканування QR
    @Value("${app.qr.base-url:http://localhost:5173}")
    private String qrBaseUrl;

    // Криптографічно стійкий випадковий токен (256 біт) для QR-коду
    public static String generateQrHash() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public List<TableResponse> getAll() {
        return repository.findAll().stream()
                .sorted((a, b) -> a.getNumber().compareTo(b.getNumber()))
                .map(TableResponse::from)
                .toList();
    }

    @Transactional
    public TableResponse create(TableCreateRequest request) {
        if (repository.existsByNumber(request.number())) {
            throw new BadRequestException("Стіл №" + request.number() + " вже існує");
        }
        RestaurantTable table = new RestaurantTable();
        table.setNumber(request.number());
        table.setQrCodeHash(generateQrHash());
        return TableResponse.from(repository.save(table));
    }

    // Інвалідує старий QR-код: старий хеш більше не пройде table-login
    @Transactional
    public TableResponse regenerateQr(UUID id) {
        RestaurantTable table = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Стіл не знайдено"));
        table.setQrCodeHash(generateQrHash());
        return TableResponse.from(repository.save(table));
    }

    // PNG з QR-кодом столу. Вміст: <frontend>/?qr=<hash>; фронтенд обмінює hash на гостьовий JWT.
    @Transactional(readOnly = true)
    public byte[] generateQrPng(UUID id, int size) {
        RestaurantTable table = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Стіл не знайдено"));
        String url = qrBaseUrl.replaceAll("/+$", "") + "/?qr=" + table.getQrCodeHash();
        try {
            BitMatrix matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, size, size, Map.of(
                    EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M, // витримує подряпини на наліпці
                    EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name(),
                    EncodeHintType.MARGIN, 2));
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        } catch (WriterException | IOException e) {
            throw new IllegalStateException("Не вдалося згенерувати QR-код", e);
        }
    }

    @Transactional
    public void updatePositions(List<TablePositionUpdateRequest> requests) {
        for (TablePositionUpdateRequest req : requests) {
            repository.findById(req.id()).ifPresent(t -> {
                t.setPositionX(req.positionX());
                t.setPositionY(req.positionY());
            });
        }
    }
}