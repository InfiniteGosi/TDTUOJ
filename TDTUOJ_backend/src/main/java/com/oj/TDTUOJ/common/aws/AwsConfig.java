package com.oj.TDTUOJ.common.aws;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * Wires up the AWS SDK v2 {@link S3Client} used for avatar/file storage.
 *
 * <p>Credentials are supplied statically from the {@code .env}/properties file rather than
 * the default provider chain so the app works identically in local dev and on the deploy VM
 * without relying on instance profiles or an AWS CLI config being present.
 */
@Configuration
public class AwsConfig {
    @Value("${aws.s3.region}")
    private String awsRegion;

    @Value("${aws.accessKeyId}")
    private String awsAccessKey;

    @Value("${aws.secretKey}")
    private String awsSecretKey;

    /**
     * Builds the credentials provider from the configured access/secret keys so S3 auth
     * does not depend on ambient AWS environment configuration.
     */
    @Bean
    public StaticCredentialsProvider staticCredentialsProvider() {
        return StaticCredentialsProvider.create(AwsBasicCredentials.create(awsAccessKey, awsSecretKey));
    }

    /**
     * The shared, thread-safe S3 client. A single instance is reused app-wide because the SDK
     * client is expensive to create and safe to share across requests.
     */
    @Bean
    public S3Client s3Client(StaticCredentialsProvider staticCredentialsProvider) {
        return S3Client.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(staticCredentialsProvider)
                .build();
    }
}
