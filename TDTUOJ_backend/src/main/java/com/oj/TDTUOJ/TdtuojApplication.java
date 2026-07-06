package com.oj.TDTUOJ;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

/**
 * Application entry point for the TDTUOJ online-judge backend.
 *
 * <p>{@code @SpringBootApplication} triggers component scanning and
 * auto-configuration across {@code com.oj.TDTUOJ}. The
 * {@code @EnableSpringDataWebSupport(VIA_DTO)} setting serializes Spring Data
 * {@code Page} objects through a stable DTO wrapper, avoiding the unstable
 * default {@code PageImpl} JSON shape.
 */
@SpringBootApplication
@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
public class TdtuojApplication {

	public static void main(String[] args) {
		SpringApplication.run(TdtuojApplication.class, args);
	}

}
