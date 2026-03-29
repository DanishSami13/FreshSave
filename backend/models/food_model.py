import sqlite3
from datetime import datetime, timedelta
from backend.config import DB_PATH

# =====================
# DB CONNECTION
# =====================
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# =====================
# FOOD TABLE
# =====================
def create_food_table():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS food_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            expiry_hours INTEGER NOT NULL,
            location TEXT,
            lat REAL,
            lng REAL,
            status TEXT DEFAULT 'approved',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


def insert_food(seller_id, name, quantity, expiry_hours, location, lat, lng):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO food_items (seller_id, name, quantity, expiry_hours, location, lat, lng, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (seller_id, name, quantity, expiry_hours, location, lat, lng))

    conn.commit()
    conn.close()


# =====================
# FOOD REQUESTS TABLE
# =====================
def create_food_requests_table():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS food_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            food_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            quantity_requested INTEGER NOT NULL,
            status TEXT DEFAULT 'requested',
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


# =====================
# USER REQUEST FLOW
# =====================
def request_food(food_id, user_id, qty):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT quantity
        FROM food_items
        WHERE id = ? AND status = 'approved'
    """, (food_id,))
    row = cursor.fetchone()

    if not row or row["quantity"] < qty:
        conn.close()
        return False

    cursor.execute("""
        INSERT INTO food_requests (food_id, user_id, quantity_requested)
        VALUES (?, ?, ?)
    """, (food_id, user_id, qty))

    conn.commit()
    conn.close()
    return True


# =====================
# SELLER VIEW
# =====================
def get_requests_for_seller(seller_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT fr.id, fi.name AS food_name, u.name AS user_name, fr.quantity_requested, fr.status
        FROM food_requests fr
        JOIN food_items fi ON fr.food_id = fi.id
        JOIN users u ON fr.user_id = u.id
        WHERE fi.seller_id = ?
        AND fr.status = 'requested'
        ORDER BY fr.requested_at DESC
    """, (seller_id,))

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


# =====================
# SELLER DECISION
# =====================
def approve_food_request(request_id, seller_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT fr.food_id, fr.quantity_requested
        FROM food_requests fr
        JOIN food_items fi ON fr.food_id = fi.id
        WHERE fr.id = ? AND fi.seller_id = ?
    """, (request_id, seller_id))

    row = cursor.fetchone()

    if not row:
        conn.close()
        return False
    
    food_id = row["food_id"]
    qty = row["quantity_requested"]

    # Check if still enough quantity
    cursor.execute("""
        SELECT quantity
        FROM food_items
        WHERE id = ?
    """, (food_id,))

    food_row = cursor.fetchone()

    if not food_row:
        conn.close()
        return False

    current_qty = food_row["quantity"]

    if current_qty < qty:
        conn.close()
        return False
    
    new_qty = current_qty - qty

    if new_qty > 0:
        cursor.execute("""
            UPDATE food_items
            SET quantity = ?
            WHERE id = ?
        """, (new_qty, food_id))
    else:
        cursor.execute("""
            DELETE FROM food_items
            WHERE id = ?
        """, (food_id,))  
    
    # 🔥 Reduce quantity ONLY HERE
    cursor.execute("""
        UPDATE food_items
        SET quantity = quantity - ?
        WHERE id = ?
    """, (qty, food_id))

    cursor.execute("""
        UPDATE food_requests
        SET status = 'approved'
        WHERE id = ?
    """, (request_id,))

    conn.commit()
    conn.close()
    return True


def reject_food_request(request_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE food_requests
        SET status = 'rejected'
        WHERE id = ?
    """, (request_id,))

    conn.commit()
    conn.close()


def get_all_food_listings():

    cleanup_expired_food()
    cleanup_old_requests()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            fi.id,
            fi.name as food_name,
            fi.quantity,
            fi.location,
            fi.lat,
            fi.lng,
            fi.expiry_hours,
            fi.created_at,
            u.name AS seller_name
        FROM food_items fi
        JOIN users u ON fi.seller_id = u.id
        WHERE fi.status = 'approved'
        AND fi.quantity > 0
        ORDER BY fi.id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]

def delete_food(food_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM food_items
        WHERE id = ?
    """, (food_id,))

    conn.commit()
    conn.close()

def cleanup_old_requests():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM food_requests
        WHERE requested_at < datetime('now','-24 hours')
        AND status != 'requested'
    """)

    conn.commit()
    conn.close()


def cleanup_expired_food():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM food_items
        WHERE quantity <= 0
        OR datetime(created_at, '+' || expiry_hours || ' hours') <= datetime('now')
    """)

    conn.commit()
    conn.close()