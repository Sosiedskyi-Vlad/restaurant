package com.vlad.restaurant.websocket;

import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.entity.RestaurantTable;
import com.vlad.restaurant.repository.MenuItemRepository;
import com.vlad.restaurant.repository.RestaurantTableRepository;
import com.vlad.restaurant.support.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.stomp.StompSession;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

// Наскрізна перевірка кроку 5: потрібна запущена БД з seed-даними (DataInitializer).
class OrderWebSocketIT extends IntegrationTestSupport {

    @Autowired RestaurantTableRepository tableRepository;
    @Autowired MenuItemRepository menuItemRepository;

    @Test
    void kitchenAndGuestReceiveOrderEvents() throws Exception {
        String cookToken = staffLogin("cook@restaurant.com", "cook123");
        String waiterToken = staffLogin("waiter@restaurant.com", "waiter123");
        RestaurantTable table = tableRepository.findAll().get(0);
        String guestToken = login("{\"qrHash\":\"" + table.getQrCodeHash() + "\"}", "table-login");
        MenuItem item = menuItemRepository.findAll().stream().filter(MenuItem::isActive).findFirst().orElseThrow();

        BlockingQueue<String> kitchen = new LinkedBlockingQueue<>();
        BlockingQueue<String> guest = new LinkedBlockingQueue<>();
        StompSession cookSession = connect(cookToken);
        subscribe(cookSession, "/topic/kitchen", kitchen);
        StompSession guestSession = connect(guestToken);
        subscribe(guestSession, "/user/queue/order-updates", guest);

        // Гість не може підписатися на кухню
        BlockingQueue<String> forbidden = new LinkedBlockingQueue<>();
        StompSession intruder = connect(guestToken);
        subscribe(intruder, "/topic/kitchen", forbidden); // сервер відповість ERROR і закриє цю сесію
        Thread.sleep(500);
        assertFalse(intruder.isConnected(), "підписка гостя на кухню мала бути відхилена");

        // Без токена підключитися неможливо
        assertThrows(Exception.class, () -> connect("bad.token"));

        // 1. Створення замовлення
        String created = send("POST", "/api/v1/orders", guestToken,
                "{\"items\":[{\"menuItemId\":" + item.getId() + ",\"quantity\":2}]}");
        String orderId = find(created, "\"id\":\"([^\"]+)\"");
        String kMsg = kitchen.poll(5, TimeUnit.SECONDS);
        String gMsg = guest.poll(5, TimeUnit.SECONDS);
        assertNotNull(kMsg, "кухня не отримала ORDER_CREATED");
        assertNotNull(gMsg, "гість не отримав ORDER_CREATED");
        assertTrue(kMsg.contains("ORDER_CREATED") && kMsg.contains(orderId));

        // 2. Зміна статусу
        send("PATCH", "/api/v1/orders/" + orderId + "/status", cookToken, "{\"status\":\"PREPARING\"}");
        kMsg = kitchen.poll(5, TimeUnit.SECONDS);
        gMsg = guest.poll(5, TimeUnit.SECONDS);
        assertNotNull(kMsg);
        assertNotNull(gMsg);
        assertTrue(gMsg.contains("ORDER_STATUS_CHANGED") && gMsg.contains("PREPARING"));

        // Прибираємо за собою: довести до PAID, щоб не лишати активних замовлень
        send("PATCH", "/api/v1/orders/" + orderId + "/status", cookToken, "{\"status\":\"READY\"}");
        send("PATCH", "/api/v1/orders/" + orderId + "/status", waiterToken, "{\"status\":\"PAID\"}");

        // Гість не отримав повідомлень зі зловмисної підписки
        assertNull(forbidden.poll(500, TimeUnit.MILLISECONDS));
        cookSession.disconnect();
        guestSession.disconnect();
    }
}
