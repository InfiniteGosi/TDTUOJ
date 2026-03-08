package com.oj.TDTUOJ.common.aws;

import org.springframework.web.multipart.MultipartFile;

import java.net.URL;
import java.time.Duration;

public interface AwsS3Service {
    URL uploadFile(String keyName, MultipartFile file);
    void deleteFile(String keyName);
    URL getFileUrl(String keyName);
    URL getPresignedUrl(String keyName, Duration duration);
    void deleteFolder(String folderPath);
    void moveFile(String sourceKey, String destinationKey);
    String readFileContent(String fileUrl);
}
