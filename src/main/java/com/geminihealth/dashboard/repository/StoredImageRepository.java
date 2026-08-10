package com.geminihealth.dashboard.repository;

import com.geminihealth.dashboard.model.StoredImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StoredImageRepository extends JpaRepository<StoredImage, Long> {
}
