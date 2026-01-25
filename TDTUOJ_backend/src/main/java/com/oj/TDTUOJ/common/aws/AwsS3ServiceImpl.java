package com.oj.TDTUOJ.common.aws;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.net.URL;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AwsS3ServiceImpl implements AwsS3Service {
    // AWS S3 client injected via constructor (thanks to @RequiredArgsConstructor)
    private final S3Client s3Client;

    // Reads the S3 bucket name from application.properties or application.yml
    @Value("${aws.s3.bucket}")
    private String bucketName;

    /**
     * Uploads a file to the specified S3 bucket and returns its public URL.
     */
    @Override
    public URL uploadFile(String keyName, MultipartFile file) {
        try {
            // Add optional metadata for debugging/tracking
            Map<String, String> metadata = new HashMap<>();
            metadata.put("uploaded-at", Instant.now().toString());
            metadata.put("original-filename", file.getOriginalFilename());
            metadata.put("content-type", file.getContentType());

            // Build S3 upload request
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(keyName)
                    .contentType(file.getContentType())
                    .metadata(metadata)
                    .build();

            // Upload file using input stream (more memory efficient)
            s3Client.putObject(
                    putObjectRequest,
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );

            // Log successful upload
            log.info("File '{}' uploaded successfully to bucket '{}'", keyName, bucketName);

            // Return public URL (or presigned URL if needed)
            return s3Client.utilities().getUrl(builder -> builder
                    .bucket(bucketName)
                    .key(keyName));

        } catch (IOException ex) {
            throw new RuntimeException("I/O error while uploading file '" + keyName + "': " + ex.getMessage(), ex);
        } catch (S3Exception ex) {
            throw new RuntimeException("AWS S3 error while uploading file '" + keyName + "': " + ex.awsErrorDetails().errorMessage(), ex);
        } catch (Exception ex) {
            throw new RuntimeException("Unexpected error while uploading file '" + keyName + "': " + ex.getMessage(), ex);
        }
    }

    /**
     * Deletes a file from the specified S3 bucket.
     */
    @Override
    public void deleteFile(String keyName) {
        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(keyName)
                    .build();

            s3Client.deleteObject(deleteObjectRequest);

            log.info("File '{}' deleted successfully from bucket '{}'", keyName, bucketName);

        } catch (S3Exception ex) {
            throw new RuntimeException("AWS S3 error while deleting file '" + keyName + "': " + ex.awsErrorDetails().errorMessage(), ex);
        } catch (Exception ex) {
            throw new RuntimeException("Unexpected error while deleting file '" + keyName + "': " + ex.getMessage(), ex);
        }
    }

    @Override
    public URL getFileUrl(String keyName) {
        try {
            return s3Client.utilities().getUrl(builder -> builder
                    .bucket(bucketName)
                    .key(keyName));
        }
        catch (S3Exception ex) {
            throw new RuntimeException("AWS S3 error while getting URL for file '" + keyName + "': " + ex.awsErrorDetails().errorMessage(), ex);
        } catch (Exception ex) {
            throw new RuntimeException("Unexpected error while getting URL for file '" + keyName + "': " + ex.getMessage(), ex);
        }
    }

    @Override
    public URL getPresignedUrl(String keyName, Duration duration) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(keyName)
                    .build();

            GetObjectPresignRequest getObjectPresignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(duration)
                    .getObjectRequest(getObjectRequest)
                    .build();

            S3Presigner presigner = S3Presigner.create();
            PresignedGetObjectRequest presignedGetObjectRequest = presigner.presignGetObject(getObjectPresignRequest);

            log.info("Generated presigned URL for file '{}' valid for {}", keyName, duration);

            return presignedGetObjectRequest.url();
        }
        catch (S3Exception ex) {
            throw new RuntimeException("AWS S3 error while generating presigned URL for file '" + keyName + "': " + ex.awsErrorDetails().errorMessage(), ex);
        } catch (Exception ex) {
            throw new RuntimeException("Unexpected error while generating presigned URL for file '" + keyName + "': " + ex.getMessage(), ex);
        }
    }

    @Override
    public void deleteFolder(String folderPath) {
        try {
            // Ensure the folder path ends with a slash
            String prefix = folderPath.endsWith("/") ? folderPath : folderPath + "/";

            // List all objects with the specified prefix
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(prefix)
                    .build();

            ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);

            // Check if folder is empty
            if (listResponse.contents().isEmpty()) {
                log.info("Folder '{}' is empty or doesn't exist in bucket '{}'", folderPath, bucketName);
                return;
            }

            // Prepare list of objects to delete
            List<ObjectIdentifier> objectsToDelete = listResponse.contents().stream()
                    .map(s3Object -> ObjectIdentifier.builder()
                            .key(s3Object.key())
                            .build())
                    .collect(Collectors.toList());

            // Delete all objects in the folder
            Delete delete = Delete.builder()
                    .objects(objectsToDelete)
                    .build();

            DeleteObjectsRequest deleteRequest = DeleteObjectsRequest.builder()
                    .bucket(bucketName)
                    .delete(delete)
                    .build();

            DeleteObjectsResponse deleteResponse = s3Client.deleteObjects(deleteRequest);

            log.info("Deleted {} objects from folder '{}' in bucket '{}'",
                    deleteResponse.deleted().size(), folderPath, bucketName);

            // Handle continuation for folders with more than 1000 objects
            while (listResponse.isTruncated()) {
                listRequest = listRequest.toBuilder()
                        .continuationToken(listResponse.nextContinuationToken())
                        .build();

                listResponse = s3Client.listObjectsV2(listRequest);

                if (!listResponse.contents().isEmpty()) {
                    objectsToDelete = listResponse.contents().stream()
                            .map(s3Object -> ObjectIdentifier.builder()
                                    .key(s3Object.key())
                                    .build())
                            .collect(Collectors.toList());

                    delete = Delete.builder()
                            .objects(objectsToDelete)
                            .build();

                    deleteRequest = DeleteObjectsRequest.builder()
                            .bucket(bucketName)
                            .delete(delete)
                            .build();

                    deleteResponse = s3Client.deleteObjects(deleteRequest);

                    log.info("Deleted additional {} objects from folder '{}' in bucket '{}'",
                            deleteResponse.deleted().size(), folderPath, bucketName);
                }
            }

            log.info("Folder '{}' deleted successfully from bucket '{}'", folderPath, bucketName);
        }
        catch (S3Exception ex) {
            throw new RuntimeException("AWS S3 error while deleting folder '" + folderPath + "': " + ex.awsErrorDetails().errorMessage(), ex);
        } catch (Exception ex) {
            throw new RuntimeException("Unexpected error while deleting folder '" + folderPath + "': " + ex.getMessage(), ex);
        }
    }

    @Override
    public void moveFile(String sourceKey, String destinationKey) {
        try {
            CopyObjectRequest copyOjbectRequest = CopyObjectRequest.builder()
                    .sourceBucket(bucketName)
                    .sourceKey(sourceKey)
                    .destinationBucket(bucketName)
                    .destinationKey(destinationKey)
                    .build();

            s3Client.copyObject(copyOjbectRequest);

            log.info("File copied from '{}' to '{}' in bucket '{}'", sourceKey, destinationKey, bucketName);

            // Delete the original file
            deleteFile(sourceKey);

            log.info("File moved successfully from '{}' to '{}' in bucket '{}'", sourceKey, destinationKey, bucketName);
        }
        catch (S3Exception ex) {
            throw new RuntimeException("AWS S3 error while moving file from '" + sourceKey + "' to '" + destinationKey + "': " + ex.awsErrorDetails().errorMessage(), ex);
        } catch (Exception ex) {
            throw new RuntimeException("Unexpected error while moving file from '" + sourceKey + "' to '" + destinationKey + "': " + ex.getMessage(), ex);
        }
    }
}
