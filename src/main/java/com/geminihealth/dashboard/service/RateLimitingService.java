package com.geminihealth.dashboard.service;

import org.springframework.stereotype.Service;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class RateLimitingService {
    
    private static class TokenBucket {
        AtomicInteger count;
        Instant resetTime;

        TokenBucket() {
            this.count = new AtomicInteger(0);
            this.resetTime = Instant.now().plus(1, ChronoUnit.HOURS);
        }
    }

    private final ConcurrentHashMap<Long, TokenBucket> userBuckets = new ConcurrentHashMap<>();
    private final int MAX_REQUESTS_PER_HOUR = 20;

    public boolean tryConsume(Long userId) {
        TokenBucket bucket = userBuckets.compute(userId, (id, b) -> {
            if (b == null || Instant.now().isAfter(b.resetTime)) {
                return new TokenBucket();
            }
            return b;
        });

        if (bucket.count.incrementAndGet() <= MAX_REQUESTS_PER_HOUR) {
            return true;
        } else {
            // Revert increment to prevent overflow
            bucket.count.decrementAndGet();
            return false;
        }
    }
}
