package com.vlad.restaurant.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@Service
public class JwtService {

    public static final String CLAIM_ROLE = "role";
    public static final String CLAIM_TABLE_ID = "tableId";
    public static final String ROLE_GUEST = "ROLE_GUEST";

    // Секрет береться з application.yaml (app.jwt.secret) / змінної оточення JWT_SECRET
    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.jwt.staff-expiration-ms:86400000}")
    private long staffExpirationMs;

    @Value("${app.jwt.guest-expiration-ms:14400000}")
    private long guestExpirationMs;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractRole(String token) {
        return extractClaim(token, c -> c.get(CLAIM_ROLE, String.class));
    }

    public UUID extractTableId(String token) {
        return UUID.fromString(extractClaim(token, c -> c.get(CLAIM_TABLE_ID, String.class)));
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        return claimsResolver.apply(extractAllClaims(token));
    }

    // Токен персоналу
    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails.getUsername(), staffExpirationMs);
    }

    // Токен гостя: роль GUEST і tableId зашиті всередині, тож бекенд завжди знає стіл
    public String generateGuestToken(UUID tableId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_ROLE, ROLE_GUEST);
        claims.put(CLAIM_TABLE_ID, tableId.toString());
        return buildToken(claims, "table:" + tableId, guestExpirationMs);
    }

    private String buildToken(Map<String, Object> claims, String subject, long expirationMs) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expirationMs))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    // Перевіряє підпис і термін дії; кидає JwtException, якщо токен недійсний
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretKey));
    }
}
