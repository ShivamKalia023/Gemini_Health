import psycopg2
import sys

try:
    conn = psycopg2.connect(
        dbname="gemini_health_db",
        user="postgres",
        password="postgres",
        host="localhost",
        port="5432"
    )
    cur = conn.cursor()
    
    # Let's first check what athletes exist
    cur.execute("SELECT id, name FROM athlete_profile")
    athletes = cur.fetchall()
    
    to_delete = []
    shivam_id = None
    
    for athlete in athletes:
        if athlete[1] and athlete[1].lower() == 'shivam kalia':
            print(f"Keeping athlete: {athlete[1]} (ID: {athlete[0]})")
            shivam_id = athlete[0]
        else:
            print(f"Will delete athlete: {athlete[1]} (ID: {athlete[0]})")
            to_delete.append(athlete[0])
            
    if not to_delete:
        print("No other athletes found to delete.")
    else:
        # Delete related activities first
        for athlete_id in to_delete:
            cur.execute("DELETE FROM activity WHERE athlete_id = %s", (athlete_id,))
            cur.execute("DELETE FROM athlete_profile WHERE id = %s", (athlete_id,))
            print(f"Deleted data for athlete ID: {athlete_id}")
            
    conn.commit()
    cur.close()
    conn.close()
    print("Database cleanup complete!")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
