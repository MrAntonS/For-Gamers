"""Small migration helpers.

This module exposes a single function `run_migrations(app)` that will attempt
to apply any small, non-destructive schema changes we historically applied
manually for SQLite databases. It also supports applying the same changes
against Postgres when running in a containerized/VM environment.

It's intentionally conservative (add-only changes) and safe to run at every
startup; it will inspect the DB schema and skip any already-applied changes.
"""

import os
from sqlalchemy import inspect, text


def _migrate_sqlite(engine):
    """Legacy SQLite file migrations (kept for local dev compatibility)."""
    conn = engine.raw_connection()
    cursor = conn.cursor()

    # List tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]

    if 'games' in tables:
        cursor.execute("PRAGMA table_info(games)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'review_count' not in columns:
            cursor.execute("ALTER TABLE games ADD COLUMN review_count INTEGER DEFAULT 0")
        if 'is_active' not in columns:
            cursor.execute("ALTER TABLE games ADD COLUMN is_active BOOLEAN DEFAULT 1")
        if 'deal_last_verified' not in columns:
            cursor.execute("ALTER TABLE games ADD COLUMN deal_last_verified DATETIME")
        if 'deal_ends_at' not in columns:
            cursor.execute("ALTER TABLE games ADD COLUMN deal_ends_at DATETIME")
        if 'platforms' not in columns:
            cursor.execute("ALTER TABLE games ADD COLUMN platforms VARCHAR(255)")
        if 'release_date' not in columns:
            cursor.execute("ALTER TABLE games ADD COLUMN release_date VARCHAR(50)")
        if 'release_year' not in columns:
            cursor.execute("ALTER TABLE games ADD COLUMN release_year INTEGER")

    if 'deal_history' not in tables:
        cursor.execute("""
            CREATE TABLE deal_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                price REAL NOT NULL,
                original_price REAL,
                discount INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games(id)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_deal_history_game_id ON deal_history(game_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_deal_history_recorded_at ON deal_history(recorded_at)")

    conn.commit()
    conn.close()


def _migrate_postgres(engine):
    """Apply the same add-only migrations against Postgres."""
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    # Use a transaction/connection that will commit DDL statements
    with engine.begin() as conn:
        if 'games' in tables:
            cols = {c['name'] for c in insp.get_columns('games')}

            if 'review_count' not in cols:
                conn.execute(text("ALTER TABLE games ADD COLUMN review_count INTEGER DEFAULT 0"))
            if 'is_active' not in cols:
                conn.execute(text("ALTER TABLE games ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
            if 'deal_last_verified' not in cols:
                conn.execute(text("ALTER TABLE games ADD COLUMN deal_last_verified TIMESTAMP WITH TIME ZONE"))
            if 'deal_ends_at' not in cols:
                conn.execute(text("ALTER TABLE games ADD COLUMN deal_ends_at TIMESTAMP WITH TIME ZONE"))
            if 'platforms' not in cols:
                conn.execute(text("ALTER TABLE games ADD COLUMN platforms VARCHAR(255)"))
            if 'release_date' not in cols:
                conn.execute(text("ALTER TABLE games ADD COLUMN release_date VARCHAR(50)"))
            if 'release_year' not in cols:
                conn.execute(text("ALTER TABLE games ADD COLUMN release_year INTEGER"))

        if 'deal_history' not in tables:
            # Use a straightforward CREATE TABLE; id as SERIAL primary key for Postgres
            conn.execute(text("""
                CREATE TABLE deal_history (
                    id SERIAL PRIMARY KEY,
                    game_id INTEGER NOT NULL REFERENCES games(id),
                    price DOUBLE PRECISION NOT NULL,
                    original_price DOUBLE PRECISION,
                    discount INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_deal_history_game_id ON deal_history(game_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_deal_history_recorded_at ON deal_history(recorded_at)"))


def run_migrations(app):
    """Run migrations against the configured app's database.

    This function is safe to call repeatedly at startup; it will only perform
    changes that are missing from the DB.
    """
    from models import db

    # Try a few ways to obtain the Engine; be tolerant to different SQLAlchemy versions
    engine = None
    try:
        engine = db.get_engine(app)
    except Exception:
        try:
            engine = db.engine
        except Exception:
            try:
                engine = db.session.get_bind()
            except Exception:
                app.logger.exception("Could not obtain SQLAlchemy engine; skipping migrations")
                return

    try:
        dialect = engine.dialect.name
    except Exception:
        app.logger.exception("Could not determine database dialect, skipping migrations")
        return

    app.logger.info("Running migrations for dialect: %s", dialect)

    try:
        if dialect == 'sqlite':
            _migrate_sqlite(engine)
        else:
            _migrate_postgres(engine)
    except Exception:
        app.logger.exception("Migration error")
        # Don't raise — fail gracefully so app can continue to run
        return

    app.logger.info("Migration complete!")


if __name__ == '__main__':
    # Backwards-compatible script entrypoint (for local dev)
    from flask import Flask
    app = Flask(__name__)
    # Use default app config to find sqlite file
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass

    # If a DATABASE_URL is provided, honor it; otherwise default to sqlite instance
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        postgres_host = os.environ.get('POSTGRES_HOST')
        if not postgres_host:
            os.makedirs(app.instance_path, exist_ok=True)
            sqlite_path = os.path.join(app.instance_path, 'local.db')
            database_url = f"sqlite:///{sqlite_path}"
        else:
            db_user = os.environ.get('POSTGRES_USER', 'postgres')
            db_pass = os.environ.get('POSTGRES_PASSWORD', 'postgres')
            db_host = postgres_host
            db_port = os.environ.get('POSTGRES_PORT', '5432')
            db_name = os.environ.get('POSTGRES_DB', 'gamernexus')
            import urllib.parse
            db_pass = urllib.parse.quote_plus(db_pass) if db_pass else db_pass
            database_url = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

    from flask_sqlalchemy import SQLAlchemy
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    from models import db
    db.init_app(app)

    with app.app_context():
        run_migrations(app)
