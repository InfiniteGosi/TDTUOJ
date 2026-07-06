package com.oj.TDTUOJ.common.security;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

/**
 * Server-side proxy that fetches a remote file and returns its body as text. Its purpose is to work
 * around browser CORS restrictions when the SPA needs to read a file hosted on another origin
 * (e.g. an S3 object served without CORS headers).
 * <p>
 * SECURITY NOTE: {@code /api/files/**} is allow-listed as public in SecurityConfig and this handler
 * fetches whatever URL the caller supplies, which is a classic SSRF surface — a caller could point
 * it at internal hosts (metadata endpoints, localhost services). It should only be exposed for
 * trusted/whitelisted destinations; treat the {@code url} parameter as untrusted.
 */
@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*") // Or specify your frontend URL
public class FileProxyController {

    /**
     * Fetches the given URL and returns its response body verbatim.
     *
     * @param url the remote resource to retrieve (caller-supplied — see SSRF note on the class)
     * @return 200 with the fetched content, or 500 with the failure message
     */
    @GetMapping("/fetch")
    public ResponseEntity<String> fetchFile(@RequestParam String url) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String content = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok(content);
        } catch (Exception e) {
            // Collapse any fetch failure (bad URL, timeout, non-2xx) into a single 500 with the reason.
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch file: " + e.getMessage());
        }
    }
}