package com.vlad.restaurant.websocket;

import com.vlad.restaurant.event.ServiceCallEvent;
import com.vlad.restaurant.security.GuestPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// Виклики персоналу: офіціанти слухають /topic/service-calls,
// гість свого столу отримує підтвердження в /user/queue/service-calls
@Component
@RequiredArgsConstructor
@Slf4j
public class ServiceCallEventListener {

    public static final String STAFF_TOPIC = "/topic/service-calls";
    public static final String GUEST_QUEUE = "/queue/service-calls";

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onServiceCallEvent(ServiceCallEvent event) {
        try {
            messagingTemplate.convertAndSend(STAFF_TOPIC, event.message());
            messagingTemplate.convertAndSendToUser(
                    GuestPrincipal.userName(event.tableId()), GUEST_QUEUE, event.message());
        } catch (Exception ex) {
            log.error("Не вдалося розіслати подію {}", event.message().type(), ex);
        }
    }
}
