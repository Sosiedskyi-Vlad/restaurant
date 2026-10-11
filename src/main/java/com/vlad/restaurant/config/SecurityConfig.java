package com.vlad.restaurant.config;

import com.vlad.restaurant.security.JwtAuthenticationFilter;
import com.vlad.restaurant.security.TokenAuthenticator;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity // вмикає @PreAuthorize
@RequiredArgsConstructor
public class SecurityConfig {

    private final TokenAuthenticator tokenAuthenticator;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        JwtAuthenticationFilter jwtFilter = new JwtAuthenticationFilter(tokenAuthenticator);

        http.csrf(AbstractHttpConfigurer::disable) // stateless API з JWT, cookie не використовуються
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/restaurant-info").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/menu/**").permitAll() // публічний перегляд меню та категорій
                        .requestMatchers(HttpMethod.POST, "/api/v1/payments/liqpay/callback").permitAll() // підпис перевіряє сервіс
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll() // handshake відкритий; JWT перевіряється на STOMP CONNECT
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Решта: потрібен валідний токен, ролі перевіряються через @PreAuthorize
                        .anyRequest().authenticated())
                // Без токена повертаємо 401 (а не 403 за замовчуванням)
                .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
