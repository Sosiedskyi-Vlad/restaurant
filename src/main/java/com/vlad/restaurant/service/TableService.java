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
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.Inet4Address;
import java.net.NetworkInterface;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Enumeration;
import java.util.Map;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class TableService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RestaurantTableRepository repository;

    // Адреса гостьового фронтенду. Якщо "auto", "localhost" або не вказано - визначається автоматично за локальним IP.
    @Value("${app.qr.base-url:auto}")
    private String configuredQrBaseUrl;

    @PostConstruct
    public void logBaseUrl() {
        log.info("Ефективна базова адреса для QR-кодів: {}", getEffectiveQrBaseUrl());
    }

    public String getEffectiveQrBaseUrl() {
        if (configuredQrBaseUrl != null 
                && !configuredQrBaseUrl.isBlank() 
                && !configuredQrBaseUrl.equalsIgnoreCase("auto")
                && !configuredQrBaseUrl.contains("localhost")
                && !configuredQrBaseUrl.contains("127.0.0.1")) {
            return configuredQrBaseUrl.replaceAll("/+$", "");
        }
        return "http://" + resolveLocalIp() + ":5173";
    }

    // Автоматично визначає локальну IP-адресу ноутбука в мережі Wi-Fi
    public static String resolveLocalIp() {
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.connect(InetAddress.getByName("8.8.8.8"), 10002);
            String ip = socket.getLocalAddress().getHostAddress();
            if (ip != null && !ip.isBlank() && !ip.equals("0.0.0.0")) {
                return ip;
            }
        } catch (Exception ignored) {}

        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp()) continue;
                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr instanceof Inet4Address && !addr.isLoopbackAddress() && !addr.isLinkLocalAddress()) {
                        return addr.getHostAddress();
                    }
                }
            }
        } catch (Exception ignored) {}

        try {
            return InetAddress.getLocalHost().getHostAddress();
        } catch (Exception ignored) {}

        return "localhost";
    }

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
        if (request.zone() != null) table.setZone(request.zone());
        if (request.shape() != null) table.setShape(request.shape());
        if (request.seats() != null) table.setSeats(request.seats());
        if (request.rotation() != null) table.setRotation(request.rotation());
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
        String url = getEffectiveQrBaseUrl() + "/?qr=" + table.getQrCodeHash();
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
                if (req.zone() != null) t.setZone(req.zone());
                if (req.shape() != null) t.setShape(req.shape());
                if (req.seats() != null) t.setSeats(req.seats());
                if (req.rotation() != null) t.setRotation(req.rotation());
                repository.save(t);
            });
        }
        repository.flush();
    }
}
