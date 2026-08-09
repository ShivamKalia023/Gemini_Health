package com.geminihealth.dashboard.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;
import java.util.Arrays;
import java.util.List;

@Service
public class LocalImageStorageService implements ImageStorageService {

    private final Path storageDirectory = Paths.get("uploads/images");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/jpeg", "image/png", "image/webp"
    );
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "jpg", "jpeg", "png", "webp"
    );

    public LocalImageStorageService() {
        try {
            Files.createDirectories(storageDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory!", e);
        }
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
    public String storeImage(MultipartFile file) throws IOException {
        validateImage(file);
        
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = StringUtils.getFilenameExtension(originalFilename);
        String uniqueFilename = UUID.randomUUID().toString() + (extension != null ? "." + extension : "");

        Path targetLocation = storageDirectory.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/images/" + uniqueFilename;
    }

    @Override
    public void deleteImage(String imagePath) {
        if (imagePath == null || !imagePath.startsWith("/uploads/images/")) {
            return;
        }
        
        try {
            String filename = imagePath.substring(imagePath.lastIndexOf("/") + 1);
            Path filePath = storageDirectory.resolve(filename).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            System.err.println("Failed to delete image: " + imagePath);
        }
    }
}
