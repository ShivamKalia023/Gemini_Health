# Gemini Health - Deployment Guide

## Security: Protecting API Credentials

This application connects to Strava and should not expose API credentials in version control. Follow these steps to deploy securely.

### Step 1: Remove Credentials from Version Control

All hardcoded credentials have been removed from `application.properties`. Never commit sensitive information.

### Step 2: Set Environment Variables

Before deploying or running the app, set the following environment variables:

#### On Windows (Command Prompt):
```cmd
set STRAVA_CLIENT_ID=your_client_id_here
set STRAVA_CLIENT_SECRET=your_client_secret_here
java -jar target\dashboard-0.0.1-SNAPSHOT.jar
```

#### On Windows (PowerShell):
```powershell
$env:STRAVA_CLIENT_ID="your_client_id_here"
$env:STRAVA_CLIENT_SECRET="your_client_secret_here"
java -jar target\dashboard-0.0.1-SNAPSHOT.jar
```

#### On Linux/Mac:
```bash
export STRAVA_CLIENT_ID="your_client_id_here"
export STRAVA_CLIENT_SECRET="your_client_secret_here"
java -jar target/dashboard-0.0.1-SNAPSHOT.jar
```

### Step 3: Docker Deployment (Optional)

If deploying via Docker, create a `.env` file (do not commit this):

**`.env` file:**
```
STRAVA_CLIENT_ID=your_client_id_here
STRAVA_CLIENT_SECRET=your_client_secret_here
```

**Build and Run with Docker:**
```bash
docker build -t gemini-health .
docker run --env-file .env -p 8080:8080 gemini-health
```

### Step 4: Production Cloud Deployment

For cloud platforms (AWS, Azure, Heroku, etc.), use their secrets management:

- **AWS**: Use AWS Secrets Manager or Systems Manager Parameter Store
- **Azure**: Use Azure Key Vault
- **Heroku**: Use `heroku config:set` command
- **Google Cloud**: Use Google Cloud Secret Manager

#### Example (Heroku):
```bash
heroku config:set STRAVA_CLIENT_ID="your_client_id_here"
heroku config:set STRAVA_CLIENT_SECRET="your_client_secret_here"
```

### Step 5: Build for Production

```bash
# Clean build
mvn clean package -DskipTests

# Run with environment variables
java -jar target/dashboard-0.0.1-SNAPSHOT.jar
```

### ✅ Checklist Before Deployment

- [ ] Removed hardcoded credentials from source code
- [ ] Never committed `.env` files or sensitive properties
- [ ] Set all required environment variables on the target system
- [ ] Tested the build locally with environment variables
- [ ] Verified the app starts without errors
- [ ] Checked that API integrations work (if Strava credentials provided)
- [ ] Reviewed all configuration files for sensitive data

### Security Best Practices

1. **Never commit secrets** - Use `.gitignore` to exclude sensitive files
2. **Use strong secrets** - Generate secure API keys and tokens
3. **Rotate credentials regularly** - Update keys periodically
4. **Principle of least privilege** - Only grant necessary permissions
5. **Use secrets management** - Leverage platform-specific secret stores
6. **Audit access logs** - Monitor who accesses the application

For more information, see `SECURITY.md`.

