package com.vlad.restaurant.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;
import org.springframework.messaging.converter.StringMessageConverter;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;

// Спільні хелпери для наскрізних тестів: реальний HTTP-сервер на випадковому порту,
// реальна БД з seed-даними (DataInitializer) і справжній STOMP-клієнт.
// Тестові ключі LiqPay: дозволяють перевірити підпис і callback без реального провайдера
@TestPropertySource(properties = {
        "app.liqpay.public-key=test_public",
        "app.liqpay.private-key=test_private"
})
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class IntegrationTestSupport {

    public record Resp(int status, String body, byte[] bytes, String contentType) {}

    @LocalServerPort
    protected int port;

    private final HttpClient http = HttpClient.newHttpClient();

    // ---------- HTTP ----------

    protected Resp call(String method, String path, String token, String body) throws Exception {
        return call(method, path, token, body, "application/json");
    }

    protected Resp call(String method, String path, String token, String body, String contentType) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .method(method, body == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(body));
        if (body != null) b.header("Content-Type", contentType);
        if (token != null) b.header("Authorization", "Bearer " + token);
        HttpResponse<byte[]> r = http.send(b.build(), HttpResponse.BodyHandlers.ofByteArray());
        return new Resp(r.statusCode(), new String(r.body(), java.nio.charset.StandardCharsets.UTF_8),
                r.body(), r.headers().firstValue("Content-Type").orElse(""));
    }

    // Очікує успішну відповідь (2xx) і повертає тіло
    protected String send(String method, String path, String token, String body) throws Exception {
        Resp r = call(method, path, token, body);
        assertTrue(r.status() < 300, method + " " + path + " -> " + r.status() + " " + r.body());
        return r.body();
    }

    protected String login(String body, String path) throws Exception {
        return find(send("POST", "/api/v1/auth/" + path, null, body), "\"token\":\"([^\"]+)\"");
    }

    protected String staffLogin(String email, String password) throws Exception {
        return login("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}", "staff-login");
    }

    protected static String find(String text, String regex) {
        Matcher m = Pattern.compile(regex).matcher(text);
        assertTrue(m.find(), "не знайдено " + regex + " у " + text);
        return m.group(1);
    }

    // ---------- STOMP ----------

    protected StompSession connect(String token) throws Exception {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new StringMessageConverter() {
            @Override
            protected boolean supportsMimeType(org.springframework.messaging.MessageHeaders headers) {
                return true; // події приходять як application/json, читаємо їх як текст
            }
        });
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer " + token);
        return client.connectAsync("ws://localhost:" + port + "/ws/orders",
                        new WebSocketHttpHeaders(), headers, new StompSessionHandlerAdapter() {})
                .get(5, TimeUnit.SECONDS);
    }

    protected void subscribe(StompSession session, String destination, BlockingQueue<String> sink) {
        session.subscribe(destination, new StompFrameHandler() {
            @Override public Type getPayloadType(StompHeaders h) { return String.class; }
            @Override public void handleFrame(StompHeaders h, Object payload) { sink.add((String) payload); }
        });
    }
}
