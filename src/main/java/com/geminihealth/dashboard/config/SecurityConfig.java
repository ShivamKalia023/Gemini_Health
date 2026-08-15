package com.geminihealth.dashboard.config;

import com.geminihealth.dashboard.filter.AuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.access.intercept.AuthorizationFilter;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private AuthenticationFilter authenticationFilter;

    @Value("${security.require-ssl:false}")
    private boolean requireSsl;

    @Value("${cors.allowed-origins:http://localhost:8081}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        
        // 1. Integration: Register custom AuthenticationFilter
        http.addFilterBefore(authenticationFilter, AuthorizationFilter.class);

        // 2. Headers Configuration
        http.headers(headers -> {
            headers.httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(31536000).includeSubDomains(true));
            headers.contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://www.strava.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"));
            headers.frameOptions(frame -> frame.deny());
            headers.contentTypeOptions(org.springframework.security.config.Customizer.withDefaults());
            headers.referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
            headers.permissionsPolicy(permissions -> permissions.policy("camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()"));
            headers.addHeaderWriter(new org.springframework.security.web.header.writers.StaticHeadersWriter("Cross-Origin-Opener-Policy", "same-origin"));
            headers.addHeaderWriter(new org.springframework.security.web.header.writers.StaticHeadersWriter("Cross-Origin-Resource-Policy", "same-origin"));
        });

        // 3. HTTPS Enforcement
        if (requireSsl) {
            http.requiresChannel(channel -> channel.anyRequest().requiresSecure());
        }

        // 4. CSRF
        CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
        requestHandler.setCsrfRequestAttributeName(null); // Opt-in to Spring Security 5 behavior for SPA

        http.csrf(csrf -> csrf
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            .csrfTokenRequestHandler(requestHandler)
        )
        .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class);

        // 5. CORS
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()));

        // 6. Logout / Session Security
        http.logout(logout -> logout
            .logoutUrl("/logout")
            .invalidateHttpSession(true)
            .deleteCookies("athlete_id", "admin_token", "XSRF-TOKEN")
            .logoutSuccessUrl("/welcome.html")
        );
        
        // Fixation Protection
        http.sessionManagement(session -> session
            .sessionFixation().migrateSession()
        );

        // 7. Authorization Model
        http.authorizeHttpRequests(authz -> authz
            .requestMatchers("/", "/welcome.html", "/waiting.html", "/favicon.ico", "/css/**", "/js/**", "/images/**", "/webjars/**", "/uploads/**", "/api/images/**", "/api/athletes/strava/**", "/api/auth/**").permitAll()
            .requestMatchers("/admin.html", "/activity-approvals.html", "/api/admin/**").hasRole("ADMIN")
            .requestMatchers("/feed.html", "/profile.html", "/leaderboard.html", "/challenges.html", "/activity.html").hasAnyRole("USER", "ADMIN")
            .anyRequest().authenticated()
        );

        return http.build();
    }

    // Suppress Spring Boot's generated security password since we handle auth via our custom AuthenticationFilter
    @Bean
    public org.springframework.security.core.userdetails.UserDetailsService userDetailsService() {
        return username -> {
            throw new org.springframework.security.core.userdetails.UsernameNotFoundException("Authentication is handled by AuthenticationFilter");
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        if (allowedOrigins != null && !allowedOrigins.isEmpty()) {
            configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        }
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Cache-Control", "Content-Type", "X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private static final class CsrfCookieFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (csrfToken != null) {
                // Render the token value to a cookie by causing the deferred token to be loaded
                csrfToken.getToken();
            }
            filterChain.doFilter(request, response);
        }
    }
}
