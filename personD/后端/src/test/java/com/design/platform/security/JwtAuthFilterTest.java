package com.design.platform.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Proxy;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtAuthFilterTest {

    private JwtService jwtService;
    private FakeStringRedisTemplate redis;
    private JwtAuthFilter filter;
    private RecordingChain chain;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService("test-secret-key-must-be-long-enough-32", Duration.ofHours(1));
        redis = new FakeStringRedisTemplate();
        filter = new JwtAuthFilter(jwtService, redis, new ObjectMapper());
        chain = new RecordingChain();
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void missingBearerContinuesWithoutContext() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        assertEquals(1, chain.calls);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void parseFailureContinuesWithoutContext() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer bad");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(1, chain.calls);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void blacklistedTokenWritesUnauthorizedAndStops() throws Exception {
        String token = jwtService.issue(1L, "alice", "USER");
        String jti = jwtService.parse(token).jti();
        redis.store.put("auth:blacklist:" + jti, "1");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(0, chain.calls);
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentType().contains("application/json"));
        assertTrue(response.getContentAsString().contains("40100"));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void validTokenSetsAuthUser() throws Exception {
        String token = jwtService.issue(8L, "alice", "ADMIN");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(1, chain.calls);
        AuthUser principal = (AuthUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        assertEquals(8L, principal.id());
        assertEquals("alice", principal.username());
        assertEquals("ADMIN", principal.role());
        assertEquals("ROLE_ADMIN", principal.getAuthorities().iterator().next().getAuthority());
    }

    static final class RecordingChain implements FilterChain {
        int calls;

        @Override
        public void doFilter(ServletRequest request, ServletResponse response) {
            calls++;
        }
    }

    static final class FakeStringRedisTemplate extends StringRedisTemplate {
        final Map<String, String> store = new HashMap<>();

        @Override
        @SuppressWarnings("unchecked")
        public ValueOperations<String, String> opsForValue() {
            return (ValueOperations<String, String>) Proxy.newProxyInstance(
                    ValueOperations.class.getClassLoader(),
                    new Class<?>[]{ValueOperations.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "get" -> store.get((String) args[0]);
                        case "set" -> {
                            store.put((String) args[0], (String) args[1]);
                            yield null;
                        }
                        default -> throw new UnsupportedOperationException(method.getName());
                    });
        }
    }
}
