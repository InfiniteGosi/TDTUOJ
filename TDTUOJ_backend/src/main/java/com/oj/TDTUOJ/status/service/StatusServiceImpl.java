package com.oj.TDTUOJ.status.service;

import com.oj.TDTUOJ.status.dto.JudgeStatusResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatusServiceImpl implements StatusService {

    @Value("${judge0.api.url}")
    private String judge0Url;

    private final WebClient.Builder webClientBuilder;

    private static final Duration TIMEOUT = Duration.ofSeconds(3);
    private static final long CACHE_TTL_MS = 10_000;

    // In-memory cache — backend runs as a single instance on the VM, so no Redis needed.
    private final AtomicReference<Cached> cache = new AtomicReference<>();

    private record Cached(JudgeStatusResponse value, long fetchedAt) {}

    @Override
    public JudgeStatusResponse getJudgeStatus() {
        Cached current = cache.get();
        long now = System.currentTimeMillis();
        if (current != null && now - current.fetchedAt() < CACHE_TTL_MS) {
            return current.value();
        }
        JudgeStatusResponse fresh = fetch();
        cache.set(new Cached(fresh, now));
        return fresh;
    }

    private JudgeStatusResponse fetch() {
        WebClient client = webClientBuilder.baseUrl(judge0Url).build();

        // 1. Probe /about and measure ping.
        String version = null;
        boolean reachable = false;
        Long pingMs = null;
        long start = System.nanoTime();
        try {
            Map about = client.get().uri("/about")
                    .retrieve().bodyToMono(Map.class)
                    .timeout(TIMEOUT).block();
            pingMs = (System.nanoTime() - start) / 1_000_000;
            reachable = true;
            if (about != null && about.get("version") != null) {
                version = about.get("version").toString();
            }
        } catch (Exception e) {
            log.warn("Judge0 /about probe failed: {}", e.getMessage());
            return JudgeStatusResponse.builder()
                    .reachable(false)
                    .workers(List.of())
                    .build();
        }

        // 2. Workers (best-effort).
        List<JudgeStatusResponse.WorkerStatus> workers = new ArrayList<>();
        try {
            List<Map> raw = client.get().uri("/workers")
                    .retrieve().bodyToFlux(Map.class)
                    .collectList().timeout(TIMEOUT).block();
            if (raw != null) {
                for (Map w : raw) {
                    Integer total   = asInt(w.get("available"));
                    Integer working = asInt(w.get("working"));
                    Integer loadPct = (total != null && total > 0 && working != null)
                            ? (int) Math.round(working * 100.0 / total) : 0;
                    workers.add(JudgeStatusResponse.WorkerStatus.builder()
                            .queue(w.get("queue") != null ? w.get("queue").toString() : "default")
                            .total(total)
                            .idle(asInt(w.get("idle")))
                            .working(working)
                            .failed(asInt(w.get("failed")))
                            .size(asInt(w.get("size")))
                            .loadPct(loadPct)
                            .available(total != null && total > 0)
                            .build());
                }
            }
        } catch (Exception e) {
            log.warn("Judge0 /workers fetch failed: {}", e.getMessage());
        }

        // Judge0 CE's /workers introspection is often empty even when the engine is up.
        // Fall back to a single synthetic engine row so the page reflects reachability.
        if (workers.isEmpty()) {
            workers.add(JudgeStatusResponse.WorkerStatus.builder()
                    .queue("judge0")
                    .available(true)
                    .build());
        }

        // 3. System info (best-effort).
        JudgeStatusResponse.SystemInfo system = null;
        try {
            Map info = client.get().uri("/system_info")
                    .retrieve().bodyToMono(Map.class)
                    .timeout(TIMEOUT).block();
            if (info != null) {
                system = JudgeStatusResponse.SystemInfo.builder()
                        .cpu(str(info.get("Model name")))
                        .arch(str(info.get("Architecture")))
                        .cpus(str(info.get("CPU(s)")))
                        .mem(str(info.get("Mem")))
                        .build();
            }
        } catch (Exception e) {
            log.warn("Judge0 /system_info fetch failed: {}", e.getMessage());
        }

        return JudgeStatusResponse.builder()
                .reachable(reachable)
                .version(version)
                .pingMs(pingMs)
                .system(system)
                .workers(workers)
                .build();
    }

    private static Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(o.toString().trim()); }
        catch (NumberFormatException e) { return null; }
    }

    private static String str(Object o) {
        return o != null ? o.toString() : null;
    }
}
