package com.geminihealth.dashboard.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface ImageStorageService {
    String storeImage(MultipartFile file) throws IOException;
    void deleteImage(String imagePath);
    void validateImage(MultipartFile file);
}
