package com.geminihealth.dashboard.util;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

import java.io.File;

/**
 * Small utility to generate a context PDF describing the application for an AI agent or reviewer.
 */
public class ReportGenerator {
    public static void main(String[] args) {
        String out = "context_report.pdf";
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.LETTER);
            doc.addPage(page);

            // Title content stream (closed after writing title)
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA_BOLD, 16);
                cs.newLineAtOffset(50, 700);
                cs.showText("Gemini Health - Application Context Report");
                cs.endText();
            }

            // Body content stream appended separately to avoid nested text state issues
            try (PDPageContentStream cs2 = new PDPageContentStream(doc, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                String[] paragraphs = new String[]{
                        "Purpose: Gemini Health is a lightweight performance dashboard that imports Strava activity data (CSV bulk imports or single GPX workouts), stores activities in an H2 file-based database, computes training metrics (TRIMP, CTL/ATL/TSB), and visualizes activities and training load in a web UI.",
                        "Primary Endpoints:",
                        " - GET /api/athletes -> list athlete profiles",
                        " - POST /api/athletes -> create athlete (body: { name, primarySport, city, state, country })",
                        " - GET /api/athletes/{id}/activities -> list activities for athlete",
                        " - POST /api/athletes/{id}/upload/csv -> upload bulk CSV activities",
                        " - POST /api/athletes/{id}/upload/gpx -> upload single GPX workout",
                        " - GET /api/athletes/{id}/performance -> computed CTL/ATL/TSB timeline",
                        " - Diagnostic: GET /api/diagnostic/stats and GET /api/diagnostic/athlete/{id}/activities/count",
                        "Data Model Summary:",
                        " - AthleteProfile: id, name, stravaId, avatarUrl, city/state/country, primarySport, weeklyDistanceGoal, restingHr, maxHr, ftp, activities",
                        " - Activity: id, stravaActivityId, athlete (many-to-one), name, type, startDate, distance (km), movingTime, elapsedTime, totalElevationGain, averageHr, maxHr, averageSpeed, averageWatts, trimp, streamJson",
                        "Important Behaviour Notes:",
                        " - CSV import uses fuzzy header mapping and supports multiple date formats; rows may be skipped if malformed/duplicate/unparseable.",
                        " - GPX import parses trackpoints, builds a stream JSON, aggregates distance and elevation and computes average/peak heart-rate.",
                        " - Performance calculations: TRIMP is computed per activity; CTL/ATL are EWMA over 42 and 7 days respectively.",
                        "How an AI agent can use this context:",
                        " - Use the endpoint list above to query the system for available athletes and their activities.",
                        " - When an import occurs, the agent should verify DB persistence via diagnostic endpoints and then request /api/athletes/{id}/performance to compute training insights.",
                        " - Use streamJson (if available) for fine-grained HR zone calculations.",
                        "Operational Notes:",
                        " - The app uses H2 file database located under ./data (db.mv.db).",
                        " - Uploaded GPX generates an Activity and returns its payload, which frontend uses to show a success banner and activity details.",
                        "Contact: Project repository and code are available locally in the workspace.",
                };

                // Join paragraphs into a single block and write once to avoid nested beginText issues
                StringBuilder all = new StringBuilder();
                for (String p : paragraphs) {
                    all.append(p).append("\n\n");
                }
                writeWrappedText(cs2, all.toString(), 50, 660, 500, 11);
            }

            doc.save(new File(out));
            System.out.println("Generated PDF: " + out);
        } catch (Exception e) {
            System.err.println("Failed to create PDF: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static void writeWrappedText(PDPageContentStream cs, String text, float startX, float startY, float width, int fontSize) throws Exception {
        cs.beginText();
        cs.setFont(PDType1Font.HELVETICA, fontSize);
        cs.newLineAtOffset(startX, startY);
        final float spaceWidth = PDType1Font.HELVETICA.getStringWidth(" ") / 1000 * fontSize;
        String[] words = text.split(" ");
        StringBuilder line = new StringBuilder();
        float curWidth = 0;
        for (String w : words) {
            float wWidth = PDType1Font.HELVETICA.getStringWidth(w) / 1000 * fontSize;
            if (curWidth + wWidth + spaceWidth > width) {
                cs.showText(line.toString());
                cs.newLineAtOffset(0, -14);
                line = new StringBuilder();
                curWidth = 0;
            }
            if (line.length() > 0) {
                line.append(' ');
                curWidth += spaceWidth;
            }
            line.append(w);
            curWidth += wWidth;
        }
        if (line.length() > 0) cs.showText(line.toString());
        cs.endText();
    }
}





