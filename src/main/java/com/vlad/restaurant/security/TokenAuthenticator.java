package com.vlad.restaurant.security;

import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

// Єдина точка перевірки JWT: її використовують і HTTP-фільтр, і WebSocket (STOMP CONNECT)
@Component
@RequiredArgsConstructor
public class TokenAuthenticator {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    // Повертає Authentication для валідного токена, інакше порожній Optional
    public Optional<UsernamePasswordAuthenticationToken> authenticate(String jwt) {
        try {
            if (JwtService.ROLE_GUEST.equals(jwtService.extractRole(jwt))) {
                return Optional.of(guest(jwt));
            }
            return staff(jwt);
        } catch (JwtException | IllegalArgumentException | UsernameNotFoundException ex) {
            // підпис невірний, токен прострочений, пошкоджений або користувача вже немає
            return Optional.empty();
        }
    }

    private UsernamePasswordAuthenticationToken guest(String jwt) {
        UUID tableId = jwtService.extractTableId(jwt); // підпис і термін дії вже перевірені парсером
        return new UsernamePasswordAuthenticationToken(
                new GuestPrincipal(tableId),
                null,
                List.of(new SimpleGrantedAuthority(JwtService.ROLE_GUEST)));
    }

    private Optional<UsernamePasswordAuthenticationToken> staff(String jwt) {
        String email = jwtService.extractUsername(jwt);
        if (email == null) {
            return Optional.empty();
        }
        UserDetails user = userDetailsService.loadUserByUsername(email);
        if (!jwtService.isTokenValid(jwt, user)) {
            return Optional.empty();
        }
        return Optional.of(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }
}
