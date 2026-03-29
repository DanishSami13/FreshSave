import sqlite3
from flask import Blueprint, jsonify, request
from backend.config import DB_PATH
from datetime import datetime, timedelta
from backend.models.food_model import (
    get_connection,
    insert_food,
    get_requests_for_seller,
    approve_food_request,
    reject_food_request,
    delete_food
)
from backend.models.activity_model import log_activity
from backend.services.role_guard import require_role

seller_bp = Blueprint("seller", __name__, url_prefix="/seller")


# ✅ SELLER ADDS FOOD
@seller_bp.route("/add-food", methods=["POST"])
@require_role("seller")
def add_food():

    data = request.get_json()

    seller_id = data.get("seller_id")
    name = data.get("name")
    quantity = data.get("quantity")
    expiry_hours = data.get("expiry_hours")
    location = data.get("location")

    # NEW: coordinates from map
    lat = data.get("lat")
    lng = data.get("lng")

    if not lat or not lng:
        return jsonify({"error": "Location pin is required"}), 400

     # ✅ Check missing fields
    if not all([seller_id, name, quantity is not None, expiry_hours is not None, location]):
        return jsonify({"error": "Missing fields"}), 400

    # ✅ Convert to int safely
    try:
        quantity = int(quantity)
        expiry_hours = int(expiry_hours)
    except ValueError:
        return jsonify({"error": "Quantity and expiry must be numbers"}), 400

    # ✅ Prevent negative values
    if quantity < 0 or expiry_hours < 0:
        return jsonify({"error": "Values cannot be negative"}), 400

    insert_food(
        seller_id=seller_id,
        name=name,
        quantity=quantity,
        expiry_hours=expiry_hours,
        location=location,
        lat=lat,
        lng=lng
    )

    log_activity(
        message=f"Seller added food: {name} ({quantity} items)",
        type="success"
    )

    return jsonify({"message": "Food added successfully"}), 201
   
# ✅ SELLER VIEWS REQUESTS
@seller_bp.route("/requests/<int:seller_id>", methods=["GET"])
@require_role("seller")
def view_requests(seller_id):
    data = get_requests_for_seller(seller_id)
    return jsonify(data), 200


# ✅ SELLER APPROVES REQUEST
@seller_bp.route("/approve-request/<int:request_id>", methods=["POST"])
@require_role("seller")
def approve_request(request_id):

    conn= get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT fi.name, fr.quantity_requested
        FROM food_requests fr
        JOIN food_items fi ON fr.food_id = fi.id
        WHERE fr.id = ?
    """, (request_id,))

    row = cursor.fetchone()

    food_name = row["name"] if row else "Unknown Food"
    quantity = row["quantity_requested"] if row else "Unknown Quantity"

    conn.close()

    data = request.get_json()
    seller_id = data.get("seller_id")

    success = approve_food_request(request_id, seller_id)   
   
    if not success:
        return jsonify({"error": "Request not found or unauthorized"}), 404

    log_activity(
        message=f"Seller approved food request: {food_name} Quantity: {quantity}",
        type="success"
    )

    return jsonify({"message": "Request approved"}), 200


# ✅ SELLER REJECTS REQUEST
@seller_bp.route("/reject-request/<int:request_id>", methods=["POST"])
@require_role("seller")
def reject_request_seller(request_id):
    
    conn= get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT fi.name, fr.quantity_requested
        FROM food_requests fr
        JOIN food_items fi ON fr.food_id = fi.id
        WHERE fr.id = ?
    """, (request_id,))

    
    row= cursor.fetchone()
    food_name = row["name"] if row else "Unknown Food"
    quantity = row["quantity_requested"] if row else "Unknown Quantity"

    reject_food_request(request_id)

    log_activity(
        message=f"Seller rejected food request: {food_name}  Quantity: {quantity}",
        type="danger"
    )

    conn.close()

    return jsonify({"message": "Request rejected"}), 200


# ✅ SELLER VIEW HIS FOOD
@seller_bp.route("/my-food/<int:seller_id>", methods=["GET"])
@require_role("seller")
def my_food(seller_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, name, quantity, expiry_hours, status, created_at
        FROM food_items
        WHERE seller_id = ? AND quantity > 0
        ORDER BY id DESC
    """, (seller_id,))

    rows = cursor.fetchall()

    foods = []

    for row in rows:

        item = dict(row)

        created = datetime.fromisoformat(item["created_at"])
        expiry_time = created + timedelta(hours=item["expiry_hours"])

        remaining = (expiry_time - datetime.utcnow()).total_seconds() / 3600

        if remaining <= 0:
            item["expiry_hours"] = 0
            item["status"] = "expired"

        # delete after 6 hours of expiry
        delete_after = expiry_time + timedelta(hours=6)

        if datetime.utcnow() > delete_after:
            delete_food(item["id"])
            continue

        else:
            item["expiry_hours"] = round(remaining, 2)

        foods.append(item)

    conn.close()

    return jsonify(foods)


# ✅ SELLER STATS
@seller_bp.route("/stats/<int:seller_id>", methods=["GET"])
@require_role("seller")
def seller_stats(seller_id):
    conn = get_connection()
    cursor = conn.cursor()

    # Total listings
    cursor.execute("SELECT COUNT(*) FROM food_items WHERE seller_id=? AND quantity > 0 AND datetime(created_at, '+' || (expiry_hours + 6) || ' hours') > datetime('now')", (seller_id,))
    total = cursor.fetchone()[0]

    # Active listings (approved & quantity > 0)
    cursor.execute("""
        SELECT COUNT(*)
        FROM food_items
        WHERE seller_id=?
        AND status='approved'
        AND quantity > 0
        AND datetime(created_at, '+' || expiry_hours || ' hours') > datetime('now')
    """, (seller_id,))
    active = cursor.fetchone()[0]

    # Picked today (approved requests today)
    cursor.execute("""
        SELECT COUNT(*)
        FROM food_requests fr
        JOIN food_items fi ON fr.food_id = fi.id
        WHERE fi.seller_id=? 
        AND fr.status='approved'
        AND DATE(fr.requested_at)=DATE('now')
    """, (seller_id,))
    picked_today = cursor.fetchone()[0]

    # Pending requests
    cursor.execute("""
        SELECT COUNT(*)
        FROM food_requests fr
        JOIN food_items fi ON fr.food_id = fi.id
        WHERE fi.seller_id=? AND fr.status='requested'
    """, (seller_id,))
    pending = cursor.fetchone()[0]

    conn.close()

    return jsonify({
        "total": total,
        "active": active,
        "picked_today": picked_today,
        "pending": pending
    })