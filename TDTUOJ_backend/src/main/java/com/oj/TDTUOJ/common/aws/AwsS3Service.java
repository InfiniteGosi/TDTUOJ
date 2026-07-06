package com.oj.TDTUOJ.common.aws;

import org.springframework.web.multipart.MultipartFile;

import java.net.URL;
import java.time.Duration;

/**
 * Abstraction over AWS S3 storage operations used for avatars, problem assets and test-case files.
 *
 * <p>Defined as an interface so callers depend on the contract (and tests can supply a fake)
 * rather than the concrete SDK-backed {@link AwsS3ServiceImpl}.
 */
public interface AwsS3Service {
    /** Uploads a file under {@code keyName} and returns its (public) object URL. */
    URL uploadFile(String keyName, MultipartFile file);

    /** Permanently removes the object at {@code keyName}. */
    void deleteFile(String keyName);

    /** Resolves the object URL for an existing key without fetching its content. */
    URL getFileUrl(String keyName);

    /** Issues a time-limited signed URL, used to grant temporary access to private objects. */
    URL getPresignedUrl(String keyName, Duration duration);

    /** Deletes every object under a key prefix (S3 has no real folders, so this is prefix-based). */
    void deleteFolder(String folderPath);

    /** Copies then deletes the source object — S3 has no native move/rename. */
    void moveFile(String sourceKey, String destinationKey);

    /** Downloads an object addressed by its full URL and returns its body as a UTF-8 string. */
    String readFileContent(String fileUrl);
}
