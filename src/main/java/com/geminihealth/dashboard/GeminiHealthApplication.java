package com.geminihealth.dashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GeminiHealthApplication {
    public static void main(String[] args) {
        SpringApplication.run(GeminiHealthApplication.class, args);
    }
}   
