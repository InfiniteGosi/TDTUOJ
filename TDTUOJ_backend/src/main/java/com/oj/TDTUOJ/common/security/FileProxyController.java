package com.oj.TDTUOJ.common.security;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*") // Or specify your frontend URL
public class FileProxyController {

    @GetMapping("/fetch")
    public ResponseEntity<String> fetchFile(@RequestParam String url) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String content = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok(content);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch file: " + e.getMessage());
        }
    }
}