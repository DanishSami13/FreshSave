import sqlite3
from flask import Blueprint, jsonify
from backend.config import DB_PATH
from backend.services.expiry_ai import get_priority
from backend.models.food_model import get_all_food_listings
from backend.services.role_guard import require_role
from datetime import datetime, timedelta


admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

from datetime import datetime, timedelta

@admin_bp.route("/food-listings", methods=["GET"])
def food_listings():
    foods = get_all_food_listings()
    result = []

    for food in foods:

        created = datetime.fromisoformat(food["created_at"])
        expiry_time = created + timedelta(hours=food["expiry_hours"])

        remaining = (expiry_time - datetime.utcnow()).total_seconds() / 3600

        # skip expired
        if remaining <= 0:
            continue

        # skip empty
        if food["quantity"] <= 0:
            continue

        result.append({
            "id": food["id"],
            "food_name": food["food_name"],
            "seller": food["seller_name"],
            "expiry_hours": round(remaining, 1),
            "quantity": food["quantity"],
            "location": food["location"],
            "priority": get_priority(
                remaining,
                food["quantity"]
            )
        })

    return jsonify(result)


@admin_bp.route("/activity", methods=["GET"])
def get_activity():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT message, type, created_at
        FROM activity_logs
        ORDER BY datetime(created_at) DESC
        LIMIT 9
    """)

    rows = cursor.fetchall()
    conn.close()

    return jsonify([
        {
            "message": row["message"],
            "type": row["type"],
            "time": row["created_at"]
        } for row in rows
    ])



@admin_bp.route("/analytics", methods=["GET"])
@require_role("admin")
def analytics():

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Users
    cursor.execute("SELECT COUNT(*) FROM users WHERE role='user'")
    users = cursor.fetchone()[0]

    # Sellers
    cursor.execute("SELECT COUNT(*) FROM users WHERE role='seller'")
    sellers = cursor.fetchone()[0]

    # ✅ Approved (ALL TIME)
    cursor.execute("SELECT COUNT(*) FROM food_requests WHERE status='approved'")
    approved = cursor.fetchone()[0]

    # ✅ Rejected (ALL TIME)
    cursor.execute("SELECT COUNT(*) FROM food_requests WHERE status='rejected'")
    rejected = cursor.fetchone()[0]

    # Meals rescued
    cursor.execute("""
        SELECT SUM(quantity_requested)
        FROM food_requests
        WHERE status='approved'
    """)
    meals_rescued = cursor.fetchone()[0] or 0

    conn.close()

    return jsonify({
        "users": users,
        "sellers": sellers,
        "approved": approved,
        "rejected": rejected,
        "mealsRescued": meals_rescued
    })

@admin_bp.route("/users", methods=["GET"])
@require_role("admin")
def get_users():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, name, role, status
        FROM users
        WHERE role != 'admin' -- Exclude admins from the list
    """)

    rows = cursor.fetchall()
    conn.close()

    return jsonify([
        {
            "id": row["id"],
            "name": row["name"],
            "role": row["role"],
            "status": row["status"]
        } for row in rows
    ])

@admin_bp.route("/toggle-user/<int:user_id>", methods=["POST"])
@require_role("admin")
def toggle_user(user_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT status FROM users WHERE id=?", (user_id,))
    current = cursor.fetchone()

    if not current:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    new_status = "blocked" if current[0] == "active" else "active"

    cursor.execute(
        "UPDATE users SET status=? WHERE id=?",
        (new_status, user_id)
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Status updated"})