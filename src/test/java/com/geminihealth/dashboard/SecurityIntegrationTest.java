package com.geminihealth.dashboard;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1",
    "spring.datasource.driverClassName=org.h2.Driver",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect"
})
public class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testPublicEndpointAccessible() throws Exception {
        mockMvc.perform(get("/welcome.html"))
                .andExpect(status().isOk());
    }

    @Test
    public void testProtectedEndpointRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/dashboard/feed"))
                .andExpect(status().isUnauthorized()); // Custom filter returns 401 for APIs
    }

    @Test
    public void testFeedHtmlRequiresAuth() throws Exception {
        mockMvc.perform(get("/feed.html"))
                .andExpect(status().is3xxRedirection()); // Custom filter redirects to /welcome.html
    }

    @Test
    public void testSecurityHeadersPresent() throws Exception {
        mockMvc.perform(get("/welcome.html"))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Frame-Options"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().exists("X-Content-Type-Options"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().exists("Referrer-Policy"))
                .andExpect(header().exists("Permissions-Policy"))
                .andExpect(header().exists("Cross-Origin-Opener-Policy"))
                .andExpect(header().exists("Cross-Origin-Resource-Policy"));
    }

    @Test
    public void testCsrfProtectionBlocksPostWithoutToken() throws Exception {
        mockMvc.perform(post("/api/challenges"))
                .andExpect(status().isForbidden()); // Spring Security CSRF blocks it with 403
    }

    @Test
    public void testCsrfProtectionAllowsPostWithToken() throws Exception {
        // Even with CSRF, it will be unauthorized (401) because no athlete_id cookie is present,
        // but it shouldn't be a 403 CSRF error anymore. It will hit the custom filter and return 401.
        mockMvc.perform(post("/api/challenges").with(csrf()))
                .andExpect(status().isUnauthorized());
    }
}
