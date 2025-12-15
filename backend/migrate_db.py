import sqlite3
import os

# Try both possible database files
db_files = ['instance/local.db', 'instance/games.db']

for db_file in db_files:
    if os.path.exists(db_file):
        print(f"Checking {db_file}...")
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        
        # List tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"  Tables: {tables}")
        
        if 'games' in tables:
            # Check existing columns
            cursor.execute("PRAGMA table_info(games)")
            columns = [row[1] for row in cursor.fetchall()]
            print(f"  Columns in games: {columns}")
            
            if 'review_count' not in columns:
                print("  Adding review_count column...")
                cursor.execute("ALTER TABLE games ADD COLUMN review_count INTEGER DEFAULT 0")
                conn.commit()
                print("  Column added successfully!")
            else:
                print("  review_count column already exists")
        
        conn.close()
    else:
        print(f"{db_file} does not exist")

print("Migration complete!")
