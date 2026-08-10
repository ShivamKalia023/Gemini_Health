package com.geminihealth.dashboard.controller;

import com.geminihealth.dashboard.model.StoredImage;
import com.geminihealth.dashboard.repository.StoredImageRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final StoredImageRepository storedImageRepository;

    public ImageController(StoredImageRepository storedImageRepository) {
        this.storedImageRepository = storedImageRepository;
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> getImage(@PathVariable Long id) {
        Optional<StoredImage> imageOpt = storedImageRepository.findById(id);

        if (imageOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }

        StoredImage image = imageOpt.get();
        HttpHeaders headers = new HttpHeaders();
        
        try {
            headers.setContentType(MediaType.parseMediaType(image.getContentType()));
        } catch (Exception e) {
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        }
        
        // Cache control headers for better performance
        headers.setCacheControl("public, max-age=86400");

        return new ResponseEntity<>(image.getData(), headers, HttpStatus.OK);
    }
}
