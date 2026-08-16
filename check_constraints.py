import psycopg2
conn = psycopg2.connect(dbname='railway', user='postgres', password='UMYKlvBTgbmPyXPEzyYZCymLyIbJdFll', host='altaria.proxy.rlwy.net', port='37609')
cur = conn.cursor()
cur.execute("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'activity'")
for row in cur.fetchall():
    print(row)
