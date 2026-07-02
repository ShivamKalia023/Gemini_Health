package com.geminihealth.dashboard.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
public class AuthenticationFilter implements Filter {

    private static final List<String> PROTECTED_PAGES = Arrays.asList(
            "/home.html",
            "/dashboard.html",
            "/leaderboard.html",
            "/challenges.html",
            "/profile.html",
            "/activity.html"
    );

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        String requestURI = httpRequest.getRequestURI();

        // Check if request is for one of the protected HTML pages
        boolean isProtected = PROTECTED_PAGES.stream().anyMatch(page -> requestURI.endsWith(page));

        if (isProtected) {
            boolean authenticated = false;
            if (httpRequest.getCookies() != null) {
                for (Cookie cookie : httpRequest.getCookies()) {
                    if ("athlete_id".equals(cookie.getName())) {
                        authenticated = true;
                        break;
                    }
                }
            }

            if (!authenticated) {
                httpResponse.sendRedirect("/welcome.html");
                return;
            }
        }

        chain.doFilter(request, response);
    }
}
