package com.geminihealth.dashboard.service;

import com.geminihealth.dashboard.model.StoredImage;
import com.geminihealth.dashboard.repository.StoredImageRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Service
public class DatabaseImageStorageService implements ImageStorageService {

    private final StoredImageRepository storedImageRepository;

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/jpeg", "image/png", "image/webp"
    );
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "jpg", "jpeg", "png", "webp"
    );

    public DatabaseImageStorageService(StoredImageRepository storedImageRepository) {
        this.storedImageRepository = storedImageRepository;
    }

    @Override
    public void validateImage(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Image exceeds the maximum allowed size of 5MB.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported image format. Allowed formats: JPG, PNG, WEBP.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            String extension = StringUtils.getFilenameExtension(originalFilename);
            if (extension == null || !ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
                throw new IllegalArgumentException("Unsupported image extension. Allowed formats: JPG, PNG, WEBP.");
            }
        }
    }

    @Override
    @Transactional
    public String storeImage(MultipartFile file) throws IOException {
        validateImage(file);

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        
        StoredImage storedImage = new StoredImage(
                originalFilename,
                file.getContentType(),
                file.getBytes()
        );
        
        storedImage = storedImageRepository.save(storedImage);

        // Return API path instead of file path
        return "/api/images/" + storedImage.getId();
    }

    @Override
    @Transactional
    public void deleteImage(String imagePath) {
        if (imagePath == null || !imagePath.startsWith("/api/images/")) {
            return;
        }

        try {
            String idStr = imagePath.substring(imagePath.lastIndexOf("/") + 1);
            Long id = Long.parseLong(idStr);
            storedImageRepository.deleteById(id);
        } catch (Exception e) {
            System.err.println("Failed to delete image from database: " + imagePath);
        }
    }
}
