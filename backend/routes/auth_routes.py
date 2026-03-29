from flask import Blueprint, request, jsonify
from backend.models.user_model import insert_user, get_user_by_email

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


# ---------- REGISTER ----------
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not all([name, email, password, role]):
        return jsonify({"error": "All fields are required"}), 400

    success = insert_user(name, email, password, role)

    if not success:
        return jsonify({"error": "Email already exists"}), 409

    return jsonify({"message": "Registration successful"}), 201


# ---------- LOGIN ----------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"error": "Email and password required"}), 400

    user = get_user_by_email(email)

    if not user or user["password"] != password:
        return jsonify({"error": "Invalid credentials"}), 401
    
     # 🔒 BLOCK CHECK
    if user.get("status") == "blocked":
        return jsonify({
            "error": "Your account has been blocked by admin"
        }), 403

    return jsonify({
        "message": "Login successful",
        "role": user["role"],
        "user_id": user["id"],
        "name": user["name"],
        "status": user.get("status", "active")  # Default to active if not set
    }), 200
