@echo off
echo ========================================================
echo Starting GFG Tracker with Local Database
echo ========================================================

set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=gemini_health_db
set PGUSER=postgres
:: Replace 'postgres' below with your actual local pgAdmin password if it is different
set PGPASSWORD=postgres

echo Host: %PGHOST%
echo Port: %PGPORT%
echo Database: %PGDATABASE%
echo.

mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Duser.timezone=UTC"
