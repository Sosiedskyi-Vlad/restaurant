package com.vlad.restaurant.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vlad.restaurant.exception.ServiceUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

// Мінімальний клієнт LiqPay API v3 без офіційного SDK.
// Протокол: data = base64(json), signature = base64(sha1(private_key + data + private_key)).
@Component
@Slf4j
public class LiqPayClient {

    // Результат розбору відповіді/callback від LiqPay
    public record Result(String status, UUID paymentId, BigDecimal amount, String currency, String providerPaymentId) {}

    private static final ObjectMapper JSON = new ObjectMapper();

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Value("${app.liqpay.public-key:}") private String publicKey;
    @Value("${app.liqpay.private-key:}") private String privateKey;
    @Value("${app.liqpay.sandbox:true}") private boolean sandbox;
    @Value("${app.liqpay.currency:UAH}") private String currency;
    @Value("${app.liqpay.checkout-url}") private String checkoutUrl;
    @Value("${app.liqpay.api-url}") private String apiUrl;
    @Value("${app.liqpay.server-callback-url:}") private String serverCallbackUrl;
    @Value("${app.liqpay.result-url:}") private String resultUrl;

    public boolean isConfigured() {
        return !publicKey.isBlank() && !privateKey.isBlank();
    }

    public void requireConfigured() {
        if (!isConfigured()) {
            throw new ServiceUnavailableException(
                    "Онлайн-оплата не налаштована (задайте LIQPAY_PUBLIC_KEY і LIQPAY_PRIVATE_KEY)");
        }
    }

    public String currency() {
        return currency;
    }

    public String checkoutUrl() {
        return checkoutUrl;
    }

    // Параметри сторінки оплати (action=pay) у вигляді base64-JSON
    public String buildCheckoutData(UUID paymentId, BigDecimal amount, String description) {
        requireConfigured();
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("version", 3);
        params.put("public_key", publicKey);
        params.put("action", "pay");
        params.put("amount", amount);
        params.put("currency", currency);
        params.put("description", description);
        params.put("order_id", paymentId.toString());
        params.put("language", "uk");
        if (sandbox) {
            params.put("sandbox", 1); // тестовий режим: реальні гроші не списуються
        }
        if (!serverCallbackUrl.isBlank()) {
            params.put("server_url", serverCallbackUrl);
        }
        if (!resultUrl.isBlank()) {
            params.put("result_url", resultUrl);
        }
        return encode(params);
    }

    public String sign(String data) {
        requireConfigured();
        return signWith(privateKey, data);
    }

    public static String signWith(String key, String data) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-1")
                    .digest((key + data + key).getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e); // SHA-1 є в кожній JVM
        }
    }

    // Перевірка підпису callback. Порівняння за сталий час - проти timing-атак.
    public boolean verifySignature(String data, String signature) {
        if (!isConfigured() || data == null || signature == null) {
            return false;
        }
        return MessageDigest.isEqual(
                signWith(privateKey, data).getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8));
    }

    // Розбір base64-JSON з callback
    public Result parse(String data) {
        return parseJson(new String(Base64.getDecoder().decode(data), StandardCharsets.UTF_8));
    }

    // Запит статусу платежу напряму в LiqPay - працює і без публічного callback-URL (локальна розробка)
    public Optional<Result> fetchStatus(UUID paymentId) {
        requireConfigured();
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("version", 3);
        params.put("public_key", publicKey);
        params.put("action", "status");
        params.put("order_id", paymentId.toString());
        String data = encode(params);
        String body = "data=" + URLEncoder.encode(data, StandardCharsets.UTF_8)
                + "&signature=" + URLEncoder.encode(sign(data), StandardCharsets.UTF_8);
        try {
            HttpResponse<String> response = http.send(
                    HttpRequest.newBuilder(URI.create(apiUrl))
                            .timeout(Duration.ofSeconds(10))
                            .header("Content-Type", "application/x-www-form-urlencoded")
                            .POST(HttpRequest.BodyPublishers.ofString(body))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("LiqPay status HTTP {}", response.statusCode());
                return Optional.empty();
            }
            JsonNode json = JSON.readTree(response.body());
            // Платіж ще не відкривали на сторінці оплати: LiqPay відповідає result=error без статусу платежу
            if (!json.has("status") || !json.has("order_id") || !json.has("payment_id")) {
                return Optional.empty();
            }
            return Optional.of(parseJson(response.body()));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ServiceUnavailableException("Запит до LiqPay перервано");
        } catch (Exception e) {
            log.warn("Не вдалося отримати статус у LiqPay", e);
            throw new ServiceUnavailableException("Платіжний сервіс тимчасово недоступний");
        }
    }

    private Result parseJson(String json) {
        try {
            JsonNode n = JSON.readTree(json);
            return new Result(
                    n.path("status").asText(""),
                    UUID.fromString(n.path("order_id").asText("")),
                    new BigDecimal(n.path("amount").asText("0")),
                    n.path("currency").asText(""),
                    n.path("payment_id").asText(""));
        } catch (IOException e) {
            throw new IllegalArgumentException("Некоректний JSON від LiqPay", e);
        }
    }

    private String encode(Map<String, Object> params) {
        try {
            return Base64.getEncoder().encodeToString(JSON.writeValueAsBytes(params));
        } catch (IOException e) {
            throw new IllegalStateException("Помилка серіалізації параметрів LiqPay", e);
        }
    }
}
