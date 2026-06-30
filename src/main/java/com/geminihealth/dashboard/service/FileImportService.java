package com.geminihealth.dashboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.geminihealth.dashboard.model.Activity;
import com.geminihealth.dashboard.model.AthleteProfile;
import com.geminihealth.dashboard.repository.ActivityRepository;
import com.geminihealth.dashboard.repository.AthleteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.*;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class FileImportService {

    @Autowired
    private AthleteRepository athleteRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private LogCaptureService log;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Standard date formatters for parsing Strava dates
    private final List<DateTimeFormatter> dateFormatters = Arrays.asList(
        DateTimeFormatter.ofPattern("MMM d, yyyy, h:mm:ss a", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("MMM d, yyyy, H:mm:ss", Locale.ENGLISH),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    );

    /**
     * Parses the CSV file containing bulk activities list.
     */
    @Transactional
    public AthleteProfile parseActivitiesCsv(MultipartFile file, AthleteProfile athlete) throws Exception {
        log.info("Starting CSV import for athlete: " + athlete.getName() + " (File: " + file.getOriginalFilename() + ")");
        
        BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
        String headerLine = br.readLine();
        if (headerLine == null) {
            throw new IllegalArgumentException("Uploaded CSV is empty");
        }

        // Detect delimiter from header line (comma, semicolon, or tab)
        char delimiter = detectDelimiter(headerLine);

        // Parse headers and map columns
        String[] headers = splitCsvRow(headerLine, delimiter);
        Map<String, Integer> colMap = new HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            String normalized = normalizeHeader(headers[i]);
            colMap.put(normalized, i);
        }

        log.info("Parsed CSV headers: " + colMap.keySet());

        // Find necessary column indices (fuzzy matching)
        int dateIdx = findIndex(colMap, "date", "activity date", "start date", "timestamp", "time", "datetime");
        int nameIdx = findIndex(colMap, "name", "activity name", "title", "summary");
        int typeIdx = findIndex(colMap, "type", "activity type", "sport", "activity");
        int elapsedIdx = findIndex(colMap, "elapsed time", "duration", "total time", "time");
        int movingIdx = findIndex(colMap, "moving time", "active time");
        int distIdx = findIndex(colMap, "distance", "distance km", "distance m", "dist");
        int elevIdx = findIndex(colMap, "elevation", "elevation gain", "total elevation gain", "gain", "elev");
        int avgHrIdx = findIndex(colMap, "avg hr", "average heartrate", "average heart rate", "heartrate", "heart rate");
        int maxHrIdx = findIndex(colMap, "max hr", "max heartrate", "maximum heart rate", "peak hr", "peak heartrate");
        int wattsIdx = findIndex(colMap, "watts", "average watts", "average power", "power");

        if (dateIdx == -1 || nameIdx == -1 || typeIdx == -1) {
            throw new IllegalArgumentException("CSV is missing critical columns (Date, Name, or Type)");
        }

        int importCount = 0;
        int skipCount = 0;
        String line;
        StringBuilder skipReasons = new StringBuilder();
        
        while ((line = br.readLine()) != null) {
            try {
                String[] row = splitCsvRow(line, delimiter);
                for (int i = 0; i < row.length; i++) {
                    row[i] = cleanCsvField(row[i]);
                }

                if (row.length <= Math.max(dateIdx, Math.max(nameIdx, typeIdx))) {
                    skipCount++;
                    skipReasons.append("Row too short (columns missing); ");
                    continue; // Skip malformed rows
                }

                String dateStr = row[dateIdx];
                String name = row[nameIdx];
                String type = row[typeIdx];
                
                LocalDateTime dateTime = parseDateTime(dateStr);
                if (dateTime == null) {
                    skipCount++;
                    skipReasons.append("Could not parse date: ").append(dateStr).append("; ");
                    continue; // Skip if date is unparseable
                }

                String activityKey = athlete.getId() + "_" + dateTime.hashCode();
                if (activityRepository.findByStravaActivityId(activityKey).isPresent()) {
                    skipCount++;
                    skipReasons.append("Duplicate activity: ").append(name).append("; ");
                    continue;
                }

                double distance = distIdx != -1 && row.length > distIdx ? parseDouble(row[distIdx]) : 0.0;
                if (distance > 1000) {
                    distance = distance / 1000.0;
                }

                int elapsed = elapsedIdx != -1 && row.length > elapsedIdx ? parseDuration(row[elapsedIdx]) : 0;
                int moving = movingIdx != -1 && row.length > movingIdx ? parseDuration(row[movingIdx]) : elapsed;
                double elev = elevIdx != -1 && row.length > elevIdx ? parseDouble(row[elevIdx]) : 0.0;
                
                Integer avgHr = avgHrIdx != -1 && row.length > avgHrIdx ? parseNullableInt(row[avgHrIdx]) : null;
                Integer maxHr = maxHrIdx != -1 && row.length > maxHrIdx ? parseNullableInt(row[maxHrIdx]) : null;
                Double watts = wattsIdx != -1 && row.length > wattsIdx ? parseNullableDouble(row[wattsIdx]) : null;

                Activity activity = new Activity();
                activity.setAthlete(athlete);
                activity.setStravaActivityId(activityKey);
                activity.setName(name);
                activity.setType(type);
                activity.setStartDate(dateTime);
                activity.setDistance(distance);
                activity.setElapsedTime(elapsed);
                activity.setMovingTime(moving);
                activity.setTotalElevationGain(elev);
                activity.setAverageHr(avgHr);
                activity.setMaxHr(maxHr);
                activity.setAverageWatts(watts);
                
                if (moving > 0 && distance > 0) {
                    activity.setAverageSpeed(distance / (moving / 3600.0));
                } else {
                    activity.setAverageSpeed(0.0);
                }

                int trimp = performanceService.calculateTrimp(activity, athlete);
                activity.setTrimp(trimp);

                activityRepository.save(activity);
                importCount++;

            } catch (Exception e) {
                log.warn("Skipped CSV row due to parse error: " + e.getMessage() + " | Row: " + line);
                skipReasons.append("Parse error: ").append(e.getMessage()).append("; ");
                skipCount++;
            }
        }
        
        br.close();
        String skipMsg = skipReasons.toString().isEmpty() ? "" : " Skip reasons: " + skipReasons.toString();
        log.info("CSV import completed: " + importCount + " activities imported, " + skipCount + " lines skipped/duplicated." + skipMsg);
        
        if (importCount == 0) {
            throw new IllegalArgumentException("No valid activities were imported from this file. This could be due to: invalid column headers, unparseable dates, or all rows being duplicates. Expected columns: Date, Name, Type. Skip details: " + (skipReasons.toString().isEmpty() ? "No skipped rows" : skipReasons.toString()));
        }

        return athleteRepository.findById(athlete.getId()).orElse(athlete);
    }

    /**
     * Parses a GPX file (XML) to import a single detailed workout with sensor streams.
     */
    @Transactional
    public Activity parseGpxWorkout(MultipartFile file, AthleteProfile athlete) throws Exception {
        log.info("Starting GPX import for athlete: " + athlete.getName() + " (File: " + file.getOriginalFilename() + ")");
        
        DocumentBuilderFactory dbFactory = DocumentBuilderFactory.newInstance();
        dbFactory.setNamespaceAware(true);
        DocumentBuilder dBuilder = dbFactory.newDocumentBuilder();
        
        InputStream is = file.getInputStream();
        Document doc = dBuilder.parse(is);
        doc.getDocumentElement().normalize();

        // 1. Extract name
        String activityName = "GPX Workout";
        NodeList nameNodes = doc.getElementsByTagName("name");
        if (nameNodes.getLength() > 0) {
            activityName = nameNodes.item(0).getTextContent();
        }

        // 2. Extract sport type
        String sportType = "Run"; // default
        NodeList typeNodes = doc.getElementsByTagName("type");
        if (typeNodes.getLength() > 0) {
            sportType = typeNodes.item(0).getTextContent();
        } else {
            // Fuzzy match based on file name or description
            String lowerName = activityName.toLowerCase();
            if (lowerName.contains("cycl") || lowerName.contains("ride") || lowerName.contains("bike")) {
                sportType = "Ride";
            } else if (lowerName.contains("swim")) {
                sportType = "Swim";
            } else if (lowerName.contains("hike") || lowerName.contains("walk")) {
                sportType = "Hike";
            }
        }

        // 3. Process Trackpoints (<trkpt>) to build streams
        NodeList trkpts = doc.getElementsByTagName("trkpt");
        if (trkpts.getLength() == 0) {
            throw new IllegalArgumentException("No trackpoints (<trkpt>) found in GPX file");
        }

        List<Map<String, Object>> streamList = new ArrayList<>();
        double totalDistance = 0.0; // km
        double totalElevGain = 0.0; // meters
        int totalHr = 0;
        int hrCount = 0;
        int maxHr = 0;
        
        LocalDateTime startDateTime = null;
        LocalDateTime lastTime = null;
        double lastLat = 0;
        double lastLon = 0;
        double lastElev = Double.NaN;
        int movingTime = 0; // seconds
        
        for (int i = 0; i < trkpts.getLength(); i++) {
            Element pt = (Element) trkpts.item(i);
            
            // Lat/Lon
            double lat = Double.parseDouble(pt.getAttribute("lat"));
            double lon = Double.parseDouble(pt.getAttribute("lon"));
            
            // Time
            LocalDateTime ptTime = null;
            NodeList timeNodes = pt.getElementsByTagName("time");
            if (timeNodes.getLength() > 0) {
                ptTime = parseDateTime(timeNodes.item(0).getTextContent());
            }
            
            if (startDateTime == null) {
                startDateTime = ptTime;
            }

            // Elevation
            double elev = 0.0;
            NodeList elevNodes = pt.getElementsByTagName("ele");
            if (elevNodes.getLength() > 0) {
                elev = Double.parseDouble(elevNodes.item(0).getTextContent());
            }

            // Heart Rate extension
            Integer hr = null;
            NodeList hrNodes = pt.getElementsByTagNameNS("*", "hr");
            if (hrNodes.getLength() > 0) {
                hr = Integer.parseInt(hrNodes.item(0).getTextContent());
            } else {
                // Secondary check for standard non-namespaced hr tag
                hrNodes = pt.getElementsByTagName("hr");
                if (hrNodes.getLength() > 0) {
                    hr = Integer.parseInt(hrNodes.item(0).getTextContent());
                }
            }

            // Distance calculation using Haversine
            if (i > 0) {
                double segmentDist = calculateDistance(lastLat, lastLon, lat, lon); // in km
                totalDistance += segmentDist;
                
                // Elevation gain calculation
                if (!Double.isNaN(lastElev) && elev > lastElev) {
                    totalElevGain += (elev - lastElev);
                }

                // Moving Time calculation (only increment if time advanced and speed > 0.5 m/s)
                if (lastTime != null && ptTime != null) {
                    long secDiff = ChronoUnit.SECONDS.between(lastTime, ptTime);
                    if (secDiff > 0 && secDiff < 30) { // filter gap spikes
                        movingTime += secDiff;
                    }
                }
            }

            // Heart Rate stats
            if (hr != null) {
                totalHr += hr;
                hrCount++;
                if (hr > maxHr) {
                    maxHr = hr;
                }
            }

            // Create stream point
            Map<String, Object> streamPoint = new HashMap<>();
            streamPoint.put("lat", lat);
            streamPoint.put("lon", lon);
            streamPoint.put("elev", elev);
            streamPoint.put("dist", Math.round(totalDistance * 1000.0) / 1000.0); // round to 3 decimals
            if (ptTime != null) {
                streamPoint.put("time", ptTime.toString());
            }
            if (hr != null) {
                streamPoint.put("hr", hr);
            }
            streamList.add(streamPoint);

            // Update trackers
            lastLat = lat;
            lastLon = lon;
            lastElev = elev;
            lastTime = ptTime;
        }

        if (startDateTime == null) {
            startDateTime = LocalDateTime.now();
        }

        int elapsedSecs = lastTime != null ? (int) ChronoUnit.SECONDS.between(startDateTime, lastTime) : movingTime;
        if (movingTime == 0) {
            movingTime = elapsedSecs;
        }

        Integer avgHr = hrCount > 0 ? (totalHr / hrCount) : null;
        Integer peakHr = hrCount > 0 ? maxHr : null;

        // Generate unique activity identifier
        String activityKey = athlete.getId() + "_gpx_" + startDateTime.hashCode();
        
        Activity activity = new Activity();
        activity.setAthlete(athlete);
        activity.setStravaActivityId(activityKey);
        activity.setName(activityName);
        activity.setType(sportType);
        activity.setStartDate(startDateTime);
        activity.setDistance(Math.round(totalDistance * 100.0) / 100.0); // round to 2 decimals
        activity.setElapsedTime(elapsedSecs);
        activity.setMovingTime(movingTime);
        activity.setTotalElevationGain(Math.round(totalElevGain * 10.0) / 10.0);
        activity.setAverageHr(avgHr);
        activity.setMaxHr(peakHr);
        
        // Average speed (km/h)
        if (movingTime > 0) {
            activity.setAverageSpeed(Math.round((totalDistance / (movingTime / 3600.0)) * 10.0) / 10.0);
        } else {
            activity.setAverageSpeed(0.0);
        }

        // If it's a ride and we want to simulate cycling power averages
        if (sportType.equalsIgnoreCase("ride")) {
            activity.setAverageWatts(180.0); // default mock power
        }

        // Serialize stream to json
        String streamJson = objectMapper.writeValueAsString(streamList);
        activity.setStreamJson(streamJson);

        // Compute TRIMP
        int trimp = performanceService.calculateTrimp(activity, athlete);
        activity.setTrimp(trimp);

        activityRepository.save(activity);
        log.info("GPX workout parsed and saved successfully. Name: " + activityName + ", Dist: " + activity.getDistance() + "km, Avg HR: " + avgHr);
        
        return activity;
    }

    // --- Helper Methods ---

    private int findIndex(Map<String, Integer> colMap, String... keys) {
        for (String key : keys) {
            String normalizedKey = normalizeHeader(key);
            if (colMap.containsKey(normalizedKey)) {
                return colMap.get(normalizedKey);
            }
            for (Map.Entry<String, Integer> entry : colMap.entrySet()) {
                if (entry.getKey().contains(normalizedKey) || normalizedKey.contains(entry.getKey())) {
                    return entry.getValue();
                }
            }
        }
        return -1;
    }

    private String cleanCsvField(String val) {
        if (val == null) return "";
        return val.replace("\uFEFF", "").replaceAll("^\"|\"$", "").trim();
    }

    private String normalizeHeader(String header) {
        if (header == null) return "";
        String normalized = cleanCsvField(header).toLowerCase(Locale.ENGLISH);
        normalized = normalized.replaceAll("[^a-z0-9]+", " ").trim();
        return normalized;
    }

    private String[] splitCsvRow(String row, char delimiter) {
        if (row == null) return new String[0];
        String regex = Pattern.quote(String.valueOf(delimiter)) + "(?=(?:[^\\\"]*\\\"[^\\\"]*\\\")*[^\\\"]*$)";
        return row.split(regex, -1);
    }

    private char detectDelimiter(String headerLine) {
        if (headerLine.contains(";")) {
            return ';';
        }
        if (headerLine.contains("\t")) {
            return '\t';
        }
        return ',';
    }

    private LocalDateTime parseDateTime(String val) {
        if (val == null || val.isEmpty()) return null;
        val = cleanCsvField(val);
        if (val.isEmpty()) return null;
        for (DateTimeFormatter formatter : dateFormatters) {
            try {
                return LocalDateTime.parse(val, formatter);
            } catch (DateTimeParseException e) {
                try {
                    return LocalDate.parse(val, formatter).atStartOfDay();
                } catch (DateTimeParseException ex) {
                    // Ignore and try next
                }
            }
        }

        try {
            String fixed = val.replace("Z", "").replace("T", " ").replace("UTC", "").replaceAll("\\+00:00|\\-00:00|Z", "").trim();
            if (fixed.contains(".")) {
                fixed = fixed.substring(0, fixed.indexOf("."));
            }
            return LocalDateTime.parse(fixed, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (Exception e) {
            try {
                return LocalDate.parse(val, DateTimeFormatter.ofPattern("yyyy-MM-dd")).atStartOfDay();
            } catch (Exception ex) {
                // Exhausted options
            }
        }
        return null;
    }

    private int parseDuration(String val) {
        String clean = cleanCsvField(val);
        if (clean.isEmpty()) return 0;
        if (clean.contains(":")) {
            String[] parts = clean.split(":");
            int seconds = 0;
            for (String part : parts) {
                seconds = seconds * 60 + Integer.parseInt(part.trim());
            }
            return seconds;
        }
        try {
            return Integer.parseInt(clean);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private double parseDouble(String val) {
        try {
            String clean = cleanCsvField(val).replaceAll("[^0-9+\\-.,Ee]", "").replaceAll(",", ".");
            if (clean.isEmpty()) return 0.0;
            return Double.parseDouble(clean);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private Integer parseNullableInt(String val) {
        String clean = cleanCsvField(val).replaceAll("[^0-9+\\-]", "");
        if (clean.isEmpty() || clean.equalsIgnoreCase("null")) return null;
        try {
            return (int) Math.round(Double.parseDouble(clean));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Double parseNullableDouble(String val) {
        String clean = cleanCsvField(val).replaceAll("[^0-9+\\-.,Ee]", "").replaceAll(",", ".");
        if (clean.isEmpty() || clean.equalsIgnoreCase("null")) return null;
        try {
            return Double.parseDouble(clean);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private int parseInt(String val) {
        try {
            return Integer.parseInt(cleanCsvField(val));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /**
     * Calculates distance in kilometers between two lat/lon coordinates (Haversine formula).
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
