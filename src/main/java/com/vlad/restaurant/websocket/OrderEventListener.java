package com.vlad.restaurant.websocket;

import com.vlad.restaurant.event.OrderEvent;
import com.vlad.restaurant.security.GuestPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// Розсилає події клієнтам тільки після успішного коміту транзакції:
// якщо транзакція відкотиться, клієнти не отримають повідомлення про неіснуючі дані,
// а якщо отримають - дані вже гарантовано є в БД.
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventListener {

    public static final String KITCHEN_TOPIC = "/topic/kitchen";
    public static final String GUEST_QUEUE = "/queue/order-updates"; // клієнт підписується на /user/queue/order-updates

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderEvent(OrderEvent event) {
        try {
            // Кухня та офіціанти - усі події
            messagingTemplate.convertAndSend(KITCHEN_TOPIC, event.message());
            // Гості столу - лише події їхнього столу
            if (event.tableId() != null) {
                messagingTemplate.convertAndSendToUser(
                        GuestPrincipal.userName(event.tableId()), GUEST_QUEUE, event.message());
            }
        } catch (Exception ex) {
            // Збій розсилки не повинен впливати на вже збережене замовлення
            log.error("Не вдалося розіслати подію {}", event.message().type(), ex);
        }
    }
}
