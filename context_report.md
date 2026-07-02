# Gemini Fitness Group Tracker — Context Report

## Purpose

Gemini Fitness Group Tracker is a lightweight performance dashboard designed to import activity data (CSV bulk or single GPX), store activities in a file-based H2 database, compute training metrics (TRIMP, CTL/ATL/TSB), and visualize activities and training load in a web UI.

## Primary Endpoints

- GET /api/athletes — list athlete profiles
- POST /api/athletes — create athlete (body: { name, primarySport, city, state, country })
- GET /api/athletes/{id}/activities — list activities for athlete
- POST /api/athletes/{id}/upload/csv — upload bulk CSV activities
- POST /api/athletes/{id}/upload/gpx — upload single GPX workout
- GET /api/athletes/{id}/performance — computed CTL/ATL/TSB timeline
- Diagnostic: GET /api/diagnostic/stats and GET /api/diagnostic/athlete/{id}/activities/count

## Data Model Summary

- AthleteProfile: id, name, stravaId, avatarUrl, city/state/country, primarySport, weeklyDistanceGoal, restingHr, maxHr, ftp, activities
- Activity: id, stravaActivityId, athlete (many-to-one), name, type, startDate, distance (km), movingTime, elapsedTime, totalElevationGain, averageHr, maxHr, averageSpeed, averageWatts, trimp, streamJson

## Important Behaviour Notes

- CSV import uses fuzzy header mapping and supports multiple date formats; rows may be skipped if malformed/duplicate/unparseable.
- GPX import parses trackpoints, builds a stream JSON, aggregates distance and elevation and computes average/peak heart-rate.
- Performance calculations: TRIMP is computed per activity; CTL/ATL are EWMA over 42 and 7 days respectively.

## How an AI agent can use this context

- Use the endpoint list to query the system for available athletes and their activities.
- After an import, verify database persistence via diagnostic endpoints and request /api/athletes/{id}/performance for training insights.
- Use `streamJson` (if available) for fine-grained HR zone calculations.

## Operational Notes

- The app uses H2 file database located under `./data` (db.mv.db).
- Uploaded GPX creates an Activity and returns its payload; the frontend uses that to show a success banner and activity details.

## Developer Notes — Upload UX change

- The frontend now prompts for athlete name when you attempt to upload a file and no athlete is selected. It will create the athlete if it does not exist and then proceed with the upload.
- To create an athlete manually via API: `POST /api/athletes` with JSON `{ "name": "Athlete Name" }`.

## Quick commands

Start the application:

```bash
java -jar target/dashboard-0.0.1-SNAPSHOT.jar
```

Create an athlete (example with PowerShell):

```powershell
Invoke-RestMethod -Uri 'http://localhost:8080/api/athletes' -Method Post -ContentType 'application/json' -Body '{"name":"Jane Athlete"}'
```

Check diagnostic status:

```bash
curl http://localhost:8080/api/diagnostic/stats
```

## Converting to PDF

If you want a PDF version of this report you can:

- Open `context_report.md` in an editor and export/print to PDF (VSCode, Typora, etc.), or
- Use `pandoc` to convert: `pandoc context_report.md -o context_report.pdf`, or
- Use the included Java `ReportGenerator` located at `src/main/java/com/geminihealth/dashboard/util/ReportGenerator.java` (requires Apache PDFBox dependency):
  - Build: `mvn clean package -DskipTests`
  - Run generator with classpath including PDFBox jars (example):

```powershell
java -cp "target/classes;C:\Users\<you>\.m2\repository\org\apache\pdfbox\pdfbox\2.0.29\pdfbox-2.0.29.jar;C:\Users\<you>\.m2\repository\org\apache\pdfbox\fontbox\2.0.29\fontbox-2.0.29.jar;C:\Users\<you>\.m2\repository\commons-logging\commons-logging\1.2\commons-logging-1.2.jar" com.geminihealth.dashboard.util.ReportGenerator
```

(If the Java generator emits nested text errors, prefer the `pandoc`/editor approach.)

---

If you want, I can:

- Wire a small UI modal (instead of prompt) to collect more athlete details on upload (city, sport, resting HR), and
- Automatically generate a PDF server-side on upload and return it in the response (requires adding a PDF endpoint and ensuring safe PDF generation).

Tell me which of these you'd like next and I will implement it.

