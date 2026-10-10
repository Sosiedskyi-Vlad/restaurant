package com.vlad.restaurant.feature;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.entity.RestaurantTable;
import com.vlad.restaurant.payment.LiqPayClient;
import com.vlad.restaurant.repository.MenuItemRepository;
import com.vlad.restaurant.repository.RestaurantTableRepository;
import com.vlad.restaurant.support.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.stomp.StompSession;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

// Наскрізна перевірка кроку 6: QR-картинки, виклик офіціанта, онлайн-оплата (підписаний callback LiqPay)
// та аналітика. Потрібна запущена БД з seed-даними.
class AdditionalFeaturesIT extends IntegrationTestSupport {

    private static final String LIQPAY_PRIVATE = "test_private";

    @Autowired RestaurantTableRepository tableRepository;
    @Autowired MenuItemRepository menuItemRepository;

    @Test
    void qrImageEncodesTableLink() throws Exception {
        String admin = staffLogin("admin@restaurant.com", "admin123");
        RestaurantTable table = tableRepository.findAll().get(0);

        Resp png = call("GET", "/api/v1/tables/" + table.getId() + "/qr.png?size=300", admin, null);
        assertEquals(200, png.status());
        assertTrue(png.contentType().startsWith("image/png"));

        // Розпізнаємо QR назад: у ньому має бути посилання з хешем столу
        var image = ImageIO.read(new ByteArrayInputStream(png.bytes()));
        String decoded = new MultiFormatReader().decode(
                new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(image)))).getText();
        assertTrue(decoded.endsWith("/?qr=" + table.getQrCodeHash()), decoded);

        // Лише адмін; гість - 403
        String guest = login("{\"qrHash\":\"" + table.getQrCodeHash() + "\"}", "table-login");
        assertEquals(403, call("GET", "/api/v1/tables/" + table.getId() + "/qr.png", guest, null).status());
        assertEquals(401, call("GET", "/api/v1/tables/" + table.getId() + "/qr.png", null, null).status());
    }

    @Test
    void guestCallsWaiterAndWaiterResolves() throws Exception {
        String waiter = staffLogin("waiter@restaurant.com", "waiter123");
        RestaurantTable table = tableRepository.findAll().get(0);
        String guest = login("{\"qrHash\":\"" + table.getQrCodeHash() + "\"}", "table-login");

        BlockingQueue<String> staffEvents = new LinkedBlockingQueue<>();
        BlockingQueue<String> guestEvents = new LinkedBlockingQueue<>();
        StompSession waiterWs = connect(waiter);
        subscribe(waiterWs, "/topic/service-calls", staffEvents);
        StompSession guestWs = connect(guest);
        subscribe(guestWs, "/user/queue/service-calls", guestEvents);
        Thread.sleep(500);

        String first = send("POST", "/api/v1/service-calls", guest, "{\"type\":\"BILL\"}");
        String id = find(first, "\"id\":\"([^\"]+)\"");
        // Повторне натискання не створює дубль
        String second = send("POST", "/api/v1/service-calls", guest, "{\"type\":\"BILL\"}");
        assertEquals(id, find(second, "\"id\":\"([^\"]+)\""));

        String created = staffEvents.poll(5, TimeUnit.SECONDS);
        assertNotNull(created, "офіціант не отримав CALL_CREATED");
        assertTrue(created.contains("CALL_CREATED") && created.contains(id));
        assertNull(staffEvents.poll(500, TimeUnit.MILLISECONDS), "дубль не мав розсилатися");
        assertNotNull(guestEvents.poll(5, TimeUnit.SECONDS));

        assertTrue(send("GET", "/api/v1/service-calls/active", waiter, null).contains(id));
        assertTrue(send("GET", "/api/v1/service-calls/my", guest, null).contains(id));
        // Гість не може закрити виклик, неправильний тип - 400
        assertEquals(403, call("PATCH", "/api/v1/service-calls/" + id + "/resolve", guest, "").status());
        assertEquals(400, call("POST", "/api/v1/service-calls", guest, "{\"type\":\"XYZ\"}").status());

        send("PATCH", "/api/v1/service-calls/" + id + "/resolve", waiter, "");
        String resolved = guestEvents.poll(5, TimeUnit.SECONDS);
        assertNotNull(resolved, "гість не отримав CALL_RESOLVED");
        assertTrue(resolved.contains("CALL_RESOLVED"));
        assertFalse(send("GET", "/api/v1/service-calls/my", guest, null).contains(id));

        waiterWs.disconnect();
        guestWs.disconnect();
    }

    @Test
    void onlinePaymentAndAnalytics() throws Exception {
        String admin = staffLogin("admin@restaurant.com", "admin123");
        String cook = staffLogin("cook@restaurant.com", "cook123");
        String waiter = staffLogin("waiter@restaurant.com", "waiter123");
        RestaurantTable table = tableRepository.findAll().get(0);
        String guest = login("{\"qrHash\":\"" + table.getQrCodeHash() + "\"}", "table-login");
        MenuItem item = menuItemRepository.findAll().stream().filter(MenuItem::isActive).findFirst().orElseThrow();

        String before = send("GET", "/api/v1/admin/analytics", admin, null);
        BigDecimal revenueBefore = new BigDecimal(find(before, "\"revenue\":([0-9.]+),\"paidOrders\""));
        long ordersBefore = Long.parseLong(find(before, "\"paidOrders\":(\\d+)"));

        // Замовлення #1 - оплачуємо онлайн ще до приготування
        String order1 = send("POST", "/api/v1/orders", guest,
                "{\"items\":[{\"menuItemId\":" + item.getId() + ",\"quantity\":2}]}");
        String order1Id = find(order1, "\"id\":\"([^\"]+)\"");
        BigDecimal total1 = new BigDecimal(find(order1, "\"total\":([0-9.]+)"));

        BlockingQueue<String> kitchen = new LinkedBlockingQueue<>();
        StompSession cookWs = connect(cook);
        subscribe(cookWs, "/topic/kitchen", kitchen);
        Thread.sleep(500);

        // Чужий гість не може оплатити це замовлення
        RestaurantTable other = tableRepository.findAll().get(1);
        String otherGuest = login("{\"qrHash\":\"" + other.getQrCodeHash() + "\"}", "table-login");
        assertEquals(404, call("POST", "/api/v1/payments/checkout", otherGuest,
                "{\"orderId\":\"" + order1Id + "\"}").status());

        String checkout = send("POST", "/api/v1/payments/checkout", guest, "{\"orderId\":\"" + order1Id + "\"}");
        String paymentId = find(checkout, "\"paymentId\":\"([^\"]+)\"");
        String data = find(checkout, "\"data\":\"([^\"]+)\"");
        assertEquals(LiqPayClient.signWith(LIQPAY_PRIVATE, data), find(checkout, "\"signature\":\"([^\"]+)\""));
        String params = new String(Base64.getDecoder().decode(data), StandardCharsets.UTF_8);
        assertTrue(params.contains("\"order_id\":\"" + paymentId + "\""), params);
        assertTrue(params.contains("\"sandbox\":1"), params);
        assertEquals(0, total1.compareTo(new BigDecimal(find(params, "\"amount\":([0-9.]+)"))));

        // Callback з підробленим підписом відхиляється
        String forged = callbackBody("sandbox", paymentId, total1);
        assertEquals(400, call("POST", "/api/v1/payments/liqpay/callback", null,
                "data=" + enc(callbackData("sandbox", paymentId, total1)) + "&signature=AAAA",
                "application/x-www-form-urlencoded").status());
        assertFalse(send("GET", "/api/v1/orders/" + order1Id, cook, null).contains("\"paid\":true"));

        // Справжній callback: замовлення стає оплаченим, кухня отримує ORDER_PAID
        assertEquals(200, call("POST", "/api/v1/payments/liqpay/callback", null, forged,
                "application/x-www-form-urlencoded").status());
        assertTrue(send("GET", "/api/v1/orders/" + order1Id, guest, null).contains("\"paid\":true"));
        String event = pollUntil(kitchen, "ORDER_PAID");
        assertNotNull(event, "кухня не отримала ORDER_PAID");
        // Повторний callback ідемпотентний; повторна оплата - 409
        assertEquals(200, call("POST", "/api/v1/payments/liqpay/callback", null, forged,
                "application/x-www-form-urlencoded").status());
        assertEquals(409, call("POST", "/api/v1/payments/checkout", guest,
                "{\"orderId\":\"" + order1Id + "\"}").status());

        // Замовлення #2 - callback зі СПРАВЖНІМ підписом, але неправильною сумою
        String order2 = send("POST", "/api/v1/orders", guest,
                "{\"items\":[{\"menuItemId\":" + item.getId() + ",\"quantity\":1}]}");
        String order2Id = find(order2, "\"id\":\"([^\"]+)\"");
        BigDecimal total2 = new BigDecimal(find(order2, "\"total\":([0-9.]+)"));
        String payment2 = find(send("POST", "/api/v1/payments/checkout", guest,
                "{\"orderId\":\"" + order2Id + "\"}"), "\"paymentId\":\"([^\"]+)\"");
        assertEquals(200, call("POST", "/api/v1/payments/liqpay/callback", null,
                callbackBody("sandbox", payment2, new BigDecimal("0.01")),
                "application/x-www-form-urlencoded").status());
        assertTrue(send("GET", "/api/v1/orders/" + order2Id, guest, null).contains("\"paid\":false"),
                "неправильна сума не повинна закривати замовлення");

        // Проводимо обидва замовлення через кухню; #2 закриваємо офіціантом (готівка)
        for (String id : new String[]{order1Id, order2Id}) {
            send("PATCH", "/api/v1/orders/" + id + "/status", cook, "{\"status\":\"PREPARING\"}");
            send("PATCH", "/api/v1/orders/" + id + "/status", cook, "{\"status\":\"READY\"}");
            send("PATCH", "/api/v1/orders/" + id + "/status", waiter, "{\"status\":\"PAID\"}");
        }

        // Аналітика: виручка зросла рівно на суму двох замовлень
        String after = send("GET", "/api/v1/admin/analytics?topLimit=3", admin, null);
        BigDecimal revenueAfter = new BigDecimal(find(after, "\"revenue\":([0-9.]+),\"paidOrders\""));
        assertEquals(0, revenueBefore.add(total1).add(total2).compareTo(revenueAfter), after);
        assertEquals(ordersBefore + 2, Long.parseLong(find(after, "\"paidOrders\":(\\d+)")));
        assertFalse(after.contains("\"avgCookingMinutes\":null"), after);
        assertTrue(after.contains("\"topItems\":[{"), after);
        assertTrue(after.contains("\"revenueByDay\":[{"), after);

        // Аналітика - лише для адміна; некоректний період - 400
        assertEquals(403, call("GET", "/api/v1/admin/analytics", waiter, null).status());
        assertEquals(400, call("GET", "/api/v1/admin/analytics?from=2026-12-31&to=2026-01-01", admin, null).status());
        cookWs.disconnect();
    }

    // ---------- хелпери ----------

    private String callbackData(String status, String paymentId, BigDecimal amount) {
        String json = "{\"status\":\"" + status + "\",\"order_id\":\"" + paymentId + "\",\"amount\":" + amount.toPlainString()
                + ",\"currency\":\"UAH\",\"payment_id\":\"123456\"}";
        return Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    // Тіло form-urlencoded callback з коректним підписом
    private String callbackBody(String status, String paymentId, BigDecimal amount) {
        String data = callbackData(status, paymentId, amount);
        return "data=" + enc(data) + "&signature=" + enc(LiqPayClient.signWith(LIQPAY_PRIVATE, data));
    }

    private static String enc(String s) {
        return java.net.URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    // Кухня може отримати й інші події (ORDER_CREATED тощо): чекаємо потрібну
    private static String pollUntil(BlockingQueue<String> queue, String marker) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < deadline) {
            String msg = queue.poll(500, TimeUnit.MILLISECONDS);
            if (msg != null && msg.contains(marker)) return msg;
        }
        return null;
    }
}
