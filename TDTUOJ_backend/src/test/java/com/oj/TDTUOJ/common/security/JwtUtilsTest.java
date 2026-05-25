package com.oj.TDTUOJ.common.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilsTest {
    private static final String SECRET = "ThisIsATestSecretMustBeAtLeastThirtyTwoBytesLongForHS256!!";

    private JwtUtils jwtUtils;
    private SecretKey key;

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "secretJwtString", SECRET);
        ReflectionTestUtils.invokeMethod(jwtUtils, "init");
        key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void generateToken_ContainsExpectedSubject() {
        String token = jwtUtils.generateToken("user@a.com");
        assertNotNull(token);
        assertEquals("user@a.com", jwtUtils.getUserNameFromToken(token));
    }

    @Test
    void isTokenValid_MatchingUserAndNotExpired_ReturnsTrue() {
        String token = jwtUtils.generateToken("user@a.com");
        UserDetails userDetails = new User("user@a.com", "x", Collections.emptyList());
        assertTrue(jwtUtils.isTokenValid(token, userDetails));
    }

    @Test
    void isTokenValid_DifferentUser_ReturnsFalse() {
        String token = jwtUtils.generateToken("user@a.com");
        UserDetails other = new User("other@a.com", "x", Collections.emptyList());
        assertFalse(jwtUtils.isTokenValid(token, other));
    }

    @Test
    void isTokenValid_Expired_ReturnsFalse_OrThrows() {
        // Forge an expired token using the same key
        String expired = Jwts.builder()
                .subject("user@a.com")
                .issuedAt(new Date(System.currentTimeMillis() - 10_000))
                .expiration(new Date(System.currentTimeMillis() - 1_000))
                .signWith(key)
                .compact();
        UserDetails userDetails = new User("user@a.com", "x", Collections.emptyList());
        // JJWT throws ExpiredJwtException on parse — treat that as invalid
        assertThrows(io.jsonwebtoken.ExpiredJwtException.class,
                () -> jwtUtils.isTokenValid(expired, userDetails));
    }

    @Test
    void getUserNameFromToken_BadSignature_Throws() {
        // Sign with a different key
        SecretKey other = Keys.hmacShaKeyFor(
                "DifferentSecretLongEnoughToSatisfyHS256RequirementBytes".getBytes(StandardCharsets.UTF_8));
        String forged = Jwts.builder()
                .subject("attacker@a.com")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(other)
                .compact();
        assertThrows(io.jsonwebtoken.security.SignatureException.class,
                () -> jwtUtils.getUserNameFromToken(forged));
    }
}
