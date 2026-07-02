package com.geminihealth.dashboard.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/")
    public String index(HttpServletRequest request) {
        boolean authenticated = false;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("athlete_id".equals(cookie.getName())) {
                    authenticated = true;
                    break;
                }
            }
        }

        if (authenticated) {
            return "redirect:/home.html";
        } else {
            return "redirect:/welcome.html";
        }
    }
}
