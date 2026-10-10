package com.vlad.restaurant.security;

import java.security.Principal;
import java.util.UUID;

// Принципал гостя за столиком: зашитий у JWT tableId, без запитів до БД на кожен запит.
// Реалізує Principal, щоб getName() давав стабільне ім'я для WebSocket user-destination:
// усі пристрої одного столу отримують однакові персональні повідомлення.
public record GuestPrincipal(UUID tableId) implements Principal {

    public static final String NAME_PREFIX = "table:";

    @Override
    public String getName() {
        return userName(tableId);
    }

    public static String userName(UUID tableId) {
        return NAME_PREFIX + tableId;
    }
}
