package com.vlad.restaurant.websocket;

import com.vlad.restaurant.security.TokenAuthenticator;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Set;

// Безпека STOMP:
//  CONNECT   - потрібен валідний JWT у заголовку Authorization: Bearer <token>
//  SUBSCRIBE - /topic/kitchen лише для персоналу, /topic/service-calls для офіціантів/адміна,
//              /user/queue/order-updates та /user/queue/service-calls для будь-кого автентифікованого,
//              усе інше заборонено
//  SEND      - заборонено (клієнти лише отримують події; зміни йдуть через REST)
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Set<String> STAFF_ROLES = Set.of("ROLE_COOK", "ROLE_WAITER", "ROLE_ADMIN");

    private final TokenAuthenticator tokenAuthenticator;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (StompCommand.CONNECT.equals(command)) {
            authenticate(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            authorizeSubscription(accessor);
        } else if (StompCommand.SEND.equals(command)) {
            throw new MessagingException("Надсилання повідомлень через WebSocket заборонено");
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessagingException("Потрібен заголовок Authorization: Bearer <token>");
        }
        UsernamePasswordAuthenticationToken auth = tokenAuthenticator.authenticate(header.substring(7))
                .orElseThrow(() -> new MessagingException("Недійсний або прострочений токен"));
        accessor.setUser(auth); // зберігається на всю WebSocket-сесію
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        Principal user = accessor.getUser();
        if (!(user instanceof Authentication auth) || !auth.isAuthenticated()) {
            throw new MessagingException("Не автентифіковано");
        }

        String destination = accessor.getDestination();
        if (destination == null) {
            throw new MessagingException("Не вказано destination");
        }

        switch (destination) {
            case "/topic/kitchen" -> {
                boolean staff = auth.getAuthorities().stream().anyMatch(a -> STAFF_ROLES.contains(a.getAuthority()));
                if (!staff) {
                    throw new MessagingException("Недостатньо прав для підписки на " + destination);
                }
            }
            case "/topic/service-calls" -> {
                boolean waiter = auth.getAuthorities().stream()
                        .anyMatch(a -> "ROLE_WAITER".equals(a.getAuthority()) || "ROLE_ADMIN".equals(a.getAuthority()));
                if (!waiter) {
                    throw new MessagingException("Недостатньо прав для підписки на " + destination);
                }
            }
            case "/user/queue/order-updates", "/user/queue/service-calls" -> { /* будь-який автентифікований користувач */ }
            default -> throw new MessagingException("Підписка на " + destination + " заборонена");
        }
    }
}
