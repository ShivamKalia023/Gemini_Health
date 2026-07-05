package com.geminihealth.dashboard.filter;

import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.repository.AthleteRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Component
public class AuthenticationFilter implements Filter {

    @Autowired
    private AthleteRepository athleteRepository;

    private static final List<String> PROTECTED_PAGES = Arrays.asList(
            "/home.html",
            "/dashboard.html",
            "/leaderboard.html",
            "/challenges.html",
            "/profile.html",
            "/activity.html"
    );

    private static final List<String> ADMIN_PAGES = Arrays.asList(
            "/admin.html"
    );

    private static final List<String> ADMIN_API = Arrays.asList(
            "/api/admin"
    );

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        String requestURI = httpRequest.getRequestURI();

        boolean isProtected = PROTECTED_PAGES.stream().anyMatch(page -> requestURI.endsWith(page));
        boolean isAdminPage = ADMIN_PAGES.stream().anyMatch(page -> requestURI.endsWith(page));
        boolean isAdminApi = ADMIN_API.stream().anyMatch(api -> requestURI.startsWith(api));
        boolean isProtectedApi = requestURI.startsWith("/api/") && !requestURI.startsWith("/api/athletes/strava") && !requestURI.startsWith("/api/auth") && !requestURI.startsWith("/api/temp");

        if (isProtected || isAdminPage || isAdminApi || isProtectedApi) {
            String athleteId = null;
            if (httpRequest.getCookies() != null) {
                for (Cookie cookie : httpRequest.getCookies()) {
                    if ("athlete_id".equals(cookie.getName())) {
                        athleteId = cookie.getValue();
                        break;
                    }
                }
            }

            if (athleteId == null) {
                if (isAdminApi || isProtectedApi) {
                    httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                } else {
                    httpResponse.sendRedirect("/welcome.html");
                }
                return;
            }

            // Load Athlete from DB to check status and role
            Optional<AthleteProfile> profileOpt = athleteRepository.findById(Long.parseLong(athleteId));
            if (profileOpt.isEmpty()) {
                if (isAdminApi || isProtectedApi) {
                    httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                } else {
                    httpResponse.sendRedirect("/welcome.html");
                }
                return;
            }

            AthleteProfile profile = profileOpt.get();

            // Admin routes check
            if (isAdminPage || isAdminApi) {
                if (profile.getRole() != AthleteProfile.Role.ADMIN) {
                    if (isAdminApi) {
                        httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    } else {
                        httpResponse.sendRedirect("/home.html");
                    }
                    return;
                }
            }

            // Protected pages check (Dashboard, etc.)
            if (isProtected || isProtectedApi) {
                if (profile.getStatus() == AthleteProfile.Status.PENDING) {
                    if (isProtectedApi) {
                        httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    } else {
                        httpResponse.sendRedirect("/waiting.html");
                    }
                    return;
                } else if (profile.getStatus() == AthleteProfile.Status.REJECTED) {
                    if (isProtectedApi) {
                        httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    } else {
                        httpResponse.sendRedirect("/welcome.html?deleted=true");
                    }
                    return;
                }
            }
        }

        chain.doFilter(request, response);
    }
}
