package com.oj.TDTUOJ.status.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Health snapshot of the Judge0 execution engine, surfaced on the public Status page.
 * Modeled on the DMOJ "Judge Status" screen, adapted to Judge0's server + worker-queue
 * architecture (no per-node uptime exists, so that column is intentionally absent).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JudgeStatusResponse {

    /** Whether Judge0 answered the /about probe. */
    private boolean reachable;

    /** Judge0 version string (from /about), null if unreachable. */
    private String version;

    /** Backend-measured round-trip latency to Judge0 /about, in milliseconds. */
    private Long pingMs;

    private SystemInfo system;

    private List<WorkerStatus> workers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemInfo {
        private String cpu;   // "Model name" from /system_info
        private String arch;  // "Architecture"
        private String cpus;  // "CPU(s)"
        private String mem;   // "Mem"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkerStatus {
        private String queue;     // queue name, e.g. "default"
        private boolean available; // reachable && totalWorkers > 0
        private Integer total;     // total workers ("available" in Judge0 /workers)
        private Integer idle;
        private Integer working;
        private Integer failed;
        private Integer size;      // pending jobs in the queue
        private Integer loadPct;   // working / total * 100
    }
}
