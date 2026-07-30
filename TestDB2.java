import java.sql.*;
public class TestDB2 {
    public static void main(String[] args) throws Exception {
        Connection conn = DriverManager.getConnection("jdbc:h2:mem:newcow_db;DB_CLOSE_DELAY=-1;MODE=MySQL", "sa", "");
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery("SELECT username, ai_analysis_result FROM social_account");
        while(rs.next()) {
            System.out.println("User: " + rs.getString("username"));
            System.out.println("AI: " + rs.getString("ai_analysis_result"));
        }
    }
}
