from flask import Blueprint, request, jsonify
from backend.models.activity_model import log_activity
from backend.models.food_model import request_food
from backend.models.activity_model import log_activity
from backend.models.food_model import request_food
from backend.config import DB_PATH
from datetime import datetime, timedelta
import sqlite3

user_bp = Blueprint("user", __name__, url_prefix="/user")


@user_bp.route("/request-food", methods=["POST"])
def request_food_api():
    data = request.json

    food_id = data.get("food_id")
    user_id = data.get("user_id")
    quantity = data.get("quantity")

    if not food_id or not user_id or not quantity:
        return jsonify({"error": "Missing required fields"}), 400

    conn= sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM food_items WHERE id = ?", (food_id,))
    row= cursor.fetchone()
    
    food_name = row["name"] if row else "Unknown Food"

    conn.close()
   
    success = request_food(food_id, user_id, quantity)

    if not success:
        return jsonify({"error": "Insufficient Quantity or Food not Approved"}), 400

    # Log activity
    log_activity(
        message=f"User Requested Food: {food_name} Quantity: {quantity}",
        type="warning"
    )

    return jsonify({"message": "Food Requested Successfully"}), 200


from backend.models.food_model import get_all_food_listings
import sqlite3
from backend.config import DB_PATH


@user_bp.route("/available-food", methods=["GET"])
def available_food():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            fi.id,
            fi.name,
            fi.quantity,
            fi.expiry_hours,
            fi.created_at,
            fi.location, 
            fi.lat,
            fi.lng,
            u.name AS seller
        FROM food_items fi
        JOIN users u ON fi.seller_id = u.id
        WHERE fi.status = 'approved' AND fi.quantity > 0
        ORDER BY fi.expiry_hours ASC
    """)

    rows = cursor.fetchall()

    foods = []

    for row in rows:

        item = dict(row)

        created = datetime.fromisoformat(item["created_at"])
        expiry_time = created + timedelta(hours=item["expiry_hours"])

        remaining = (expiry_time - datetime.utcnow()).total_seconds() / 3600

        # Only show valid food
        if remaining > 0:
            item["expiry_hours"] = round(remaining, 2)
            foods.append(item)

    # sort by expiry (soonest first)
    foods.sort(key=lambda x: x["expiry_hours"])

    conn.close()

    return jsonify(foods)


@user_bp.route("/my-requests/<int:user_id>", methods=["GET"])
def my_requests(user_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT fr.id,
        fi.name AS food_name,
        fr.quantity_requested,
        fr.status,
        fr.requested_at
    FROM food_requests fr
    JOIN food_items fi ON fr.food_id = fi.id
    WHERE fr.user_id = ?
    AND fr.requested_at >= datetime('now', '-24 hours')
    ORDER BY fr.requested_at DESC
    """, (user_id,))

    rows = cursor.fetchall()
    conn.close()

    return jsonify([dict(row) for row in rows])

@user_bp.route("/stats/live", methods=["GET"])
def live_stats():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # total meals rescued (sum of quantities)
    cursor.execute("""
        SELECT SUM(quantity) as total_meals
        FROM food_items
        WHERE status='approved'
    """)
    meals = cursor.fetchone()["total_meals"] or 0

    # active listings
    cursor.execute("""
        SELECT COUNT(*) as active
        FROM food_items
        WHERE status='approved' AND quantity > 0
    """)
    listings = cursor.fetchone()["active"]

    # Users count
    cursor.execute("""
        SELECT COUNT(*) as users
        FROM users
        WHERE role='user'
    """)
    users = cursor.fetchone()["users"]

    conn.close()

    return jsonify({
        "meals": meals,
        "listings": listings,
        "users": users
    })