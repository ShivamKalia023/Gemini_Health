# Security Documentation

## Credential Management

### Why This Matters

Hardcoding credentials (API keys, secrets, passwords) in your source code is a critical security risk:

1. **Version Control History**: Credentials committed to Git are permanently in the history
2. **Accidental Exposure**: Developers might accidentally commit credentials
3. **Insider Threats**: Anyone with repository access has the credentials
4. **Third-Party Exposure**: If you share code or use public repositories, secrets are exposed
5. **Regulatory Compliance**: GDPR, HIPAA, SOC 2 require credential protection

### Implementation

This application uses **Spring Boot Configuration** with environment variables:

```
┌─────────────────────────────────────────┐
│  Application Startup (production)       │
├─────────────────────────────────────────┤
│  1. Read environment variables          │
│  2. Resolve ${STRAVA_CLIENT_ID:}       │
│  3. Load via StravaConfig bean          │
│  4. Access via @Value or constructor   │
└─────────────────────────────────────────┘
```

### Configuration Flow

**application.properties** (committed to repo - NO SECRETS)
```properties
strava.client-id=${STRAVA_CLIENT_ID:}
strava.client-secret=${STRAVA_CLIENT_SECRET:}
```

**Environment** (set on deployment server - CONTAINS SECRETS)
```
STRAVA_CLIENT_ID=your_actual_id
STRAVA_CLIENT_SECRET=your_actual_secret
```

**StravaConfig.java** (Spring reads and injects)
```java
@Value("${strava.client-id:}")
private String clientId;
```

### How to Use Locally

#### Windows Command Prompt:
```cmd
set STRAVA_CLIENT_ID=261359
set STRAVA_CLIENT_SECRET=1e8de32f620aae008f7a9a52a91611890d6bcd5d
mvn spring-boot:run
```

#### Windows PowerShell:
```powershell
$env:STRAVA_CLIENT_ID="261359"
$env:STRAVA_CLIENT_SECRET="1e8de32f620aae008f7a9a52a91611890d6bcd5d"
mvn spring-boot:run
```

#### Linux / macOS:
```bash
export STRAVA_CLIENT_ID="261359"
export STRAVA_CLIENT_SECRET="1e8de32f620aae008f7a9a52a91611890d6bcd5d"
mvn spring-boot:run
```

### How to Deploy

See `DEPLOYMENT.md` for detailed deployment instructions for:
- Local development
- Docker
- AWS
- Azure
- Heroku
- Google Cloud
- Other cloud platforms

### Verify Configuration

The application logs the configuration status on startup:
```
INFO: Strava configuration loaded
```

If credentials are not set, the app still runs but Strava integration features may not work.

### Best Practices Checklist

- [x] **Never hardcode secrets** in source files
- [x] **Use environment variables** for credentials
- [x] **Exclude .env files** from version control (.gitignore)
- [x] **Provide .env.example** as a template
- [x] **Document the setup** process
- [x] **Use platform-specific secrets** for production (AWS Secrets Manager, etc.)
- [x] **Rotate credentials** regularly
- [x] **Use minimal permissions** for API tokens
- [x] **Audit access logs** regularly
- [x] **Never share credentials** in chat, email, or tickets

### Common Mistakes to Avoid

❌ **BAD**: Committing secrets to Git
```
application.properties contains: strava.client-secret=abc123xyz
```

❌ **BAD**: Hard-coding credentials in Java code
```java
String clientId = "261359";  // DON'T DO THIS
```

❌ **BAD**: Sharing credentials in documentation or tickets
```
Instructions: Use client_id: 261359, secret: 1e8de32f...
```

✅ **GOOD**: Using environment variables
```
export STRAVA_CLIENT_ID="..."
```

✅ **GOOD**: Using cloud platform secrets
```
AWS Secrets Manager: gemini-health/strava-credentials
```

### Revoking Compromised Credentials

If you ever accidentally commit or expose credentials:

1. **Immediately revoke** the API key in Strava settings
2. **Generate new credentials**
3. **Update environment variables** on all deployment servers
4. **Remove from Git history** (if using private repo):
   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch application.properties' \
     --prune-empty -- --all
   ```
5. **Force push** (only if private repo):
   ```bash
   git push origin --force --all
   ```

### References

- [12-Factor App - Config](https://12factor.net/config)
- [Spring Boot Externalized Configuration](https://spring.io/guides/gs/externalized-configuration/)
- [OWASP - Secrets Management](https://owasp.org/www-community/Sensitive_Data_Exposure)

