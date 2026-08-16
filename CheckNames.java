import java.sql.*;

public class CheckNames {
    public static void main(String[] args) throws Exception {
        Connection conn = DriverManager.getConnection("jdbc:postgresql://localhost:5432/gemini_health_db", "postgres", "postgres");
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery("SELECT name FROM athlete_profile");
        while (rs.next()) {
            System.out.println("Name: " + rs.getString("name"));
        }
        rs.close();
        stmt.close();
        conn.close();
    }
}
