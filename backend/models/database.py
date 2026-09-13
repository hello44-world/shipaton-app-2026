"""
Real persistence for WattGuard — SQLite, no external service needed.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "wattguard.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            country TEXT,
            city TEXT,
            area TEXT,
            latitude REAL,
            longitude REAL,
            num_solar_plates INTEGER DEFAULT 0,
            has_battery INTEGER DEFAULT 0,
            battery_capacity_wh INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS appliances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            model TEXT,
            category TEXT NOT NULL CHECK(category IN ('permanent', 'temporary')),
            watts INTEGER NOT NULL
        );
    """)
    conn.commit()
    conn.close()


def create_user(username, password, country, city, area, latitude, longitude):
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO users (username, password, country, city, area, latitude, longitude) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (username, password, country, city, area, latitude, longitude),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_user_by_username(username):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_user_by_id(user_id):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_user_setup(user_id, num_solar_plates, has_battery, battery_capacity_wh):
    conn = get_db()
    try:
        conn.execute(
            "UPDATE users SET num_solar_plates = ?, has_battery = ?, battery_capacity_wh = ? "
            "WHERE id = ?",
            (num_solar_plates, int(has_battery), battery_capacity_wh, user_id),
        )
        conn.commit()
    finally:
        conn.close()


def set_user_appliances(user_id, appliances):
    conn = get_db()
    try:
        conn.execute("DELETE FROM appliances WHERE user_id = ?", (user_id,))
        conn.executemany(
            "INSERT INTO appliances (user_id, name, model, category, watts) "
            "VALUES (?, ?, ?, ?, ?)",
            [
                (user_id, a["name"], a.get("model"), a["category"], a["watts"])
                for a in appliances
            ],
        )
        conn.commit()
    finally:
        conn.close()


def get_user_appliances(user_id):
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT id, name, model, category, watts FROM appliances WHERE user_id = ?",
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()