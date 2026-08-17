package com.design.platform.storage;

import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class StorageService {

    private final MinioClient minioClient;
    private final String publicBaseUrl;
    private final List<String> buckets;

    public StorageService(
            MinioClient minioClient,
            @Value("${app.minio.public-base-url}") String publicBaseUrl,
            @Value("${app.minio.buckets.templates}") String templatesBucket,
            @Value("${app.minio.buckets.assets}") String assetsBucket,
            @Value("${app.minio.buckets.works}") String worksBucket) {
        this.minioClient = minioClient;
        this.publicBaseUrl = stripTrailingSlash(publicBaseUrl);
        this.buckets = List.of(templatesBucket, assetsBucket, worksBucket);
    }

    public StoredObject upload(
            String bucket, String originalFilename, String contentType, InputStream in, long size) {
        String objectKey = ObjectKeys.of(
                originalFilename,
                LocalDate.now(),
                UUID.randomUUID().toString().replace("-", ""));
        try {
            PutObjectArgs.Builder builder = PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .stream(in, size, -1);
            if (contentType != null && !contentType.isBlank()) {
                builder.contentType(contentType);
            }
            minioClient.putObject(builder.build());
        } catch (Exception e) {
            throw new BizException(ErrorCode.INTERNAL, "文件上传失败");
        }
        String url = publicBaseUrl + "/" + bucket + "/" + objectKey;
        return new StoredObject(bucket, objectKey, url);
    }

    public void delete(String bucket, String objectKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .build());
        } catch (Exception e) {
            throw new BizException(ErrorCode.INTERNAL, "文件删除失败");
        }
    }

    public void ensureBuckets() {
        for (String bucket : buckets) {
            try {
                boolean exists = minioClient.bucketExists(
                        BucketExistsArgs.builder().bucket(bucket).build());
                if (!exists) {
                    minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                }
            } catch (Exception e) {
                throw new BizException(ErrorCode.INTERNAL, "初始化存储桶失败: " + bucket);
            }
        }
    }

    private static String stripTrailingSlash(String url) {
        if (url != null && url.endsWith("/")) {
            return url.substring(0, url.length() - 1);
        }
        return url;
    }
}
