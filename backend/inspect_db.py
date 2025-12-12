import sqlite3
import os
import json

# Path to the database
base_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(base_dir, 'instance', 'local.db')

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row # Access columns by name
cursor = conn.cursor()

# Find games that have been updated with requirements
cursor.execute("SELECT count(*) FROM games")
total_games = cursor.fetchone()[0]

cursor.execute("SELECT count(*) FROM games WHERE pc_requirements IS NOT NULL AND pc_requirements != ''")
updated_games = cursor.fetchone()[0]

print(f"Total Games: {total_games}")
print(f"Games with Requirements: {updated_games}")
print("-" * 30)

cursor.execute("SELECT title, pc_requirements FROM games WHERE pc_requirements IS NOT NULL AND pc_requirements != '' LIMIT 3")
rows = cursor.fetchall()

if rows:
    for row in rows:
        print(f"Game: {row['title']}")
        reqs = row['pc_requirements']
        try:
            # Try to parse JSON for display
            parsed = json.loads(reqs)
            print(f"Requirements (JSON):")
            print(json.dumps(parsed, indent=2))
        except json.JSONDecodeError:
            print(f"Requirements (Raw String - Not JSON yet): {reqs[:100]}...")
        print("-" * 30)
else:
    print("No games found with populated requirements yet. The background task might still be working.")

conn.close()
