from flask import Flask, send_from_directory
from flask_cors import CORS

from backend.routes.auth_routes import auth_bp
from backend.routes.user_routes import user_bp
from backend.routes.seller_routes import seller_bp
from backend.routes.admin_routes import admin_bp

from backend.models.activity_model import create_activity_table
from backend.models.user_model import create_users_table
from backend.models.food_model import (
    create_food_table,
    create_food_requests_table
)
from backend.models.user_model import insert_user, get_user_by_email

# Create default admin if not exists
if not get_user_by_email("danish@gmail.com"):
    insert_user(
        name="Admin",
        email="admin@gmail.com",
        password="admin123", 
        role="admin"
    )

import os

app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), "../frontend"),
    static_url_path=""
)


CORS(app, resources={r"/*": {"origins": "*"}})

app.config["SECRET_KEY"] = "freshsave_secret_key"

# ✅ Create tables FIRST
create_users_table()
create_food_table()
create_food_requests_table()
create_activity_table()

# ✅ Register blueprints ONCE
app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)
app.register_blueprint(seller_bp)
app.register_blueprint(admin_bp)

FRONTEND_PATH = os.path.join(os.path.dirname(__file__), "../frontend")

@app.route("/")
def home():
    return send_from_directory(FRONTEND_PATH, "index.html")

@app.route("/login")
def login():
    return send_from_directory(FRONTEND_PATH, "login.html")

@app.route("/register")
def register():
    return send_from_directory(FRONTEND_PATH, "register.html")

@app.route("/admin")
def admin():
    return send_from_directory(os.path.join(FRONTEND_PATH, "admin"), "admin-dashboard.html")

@app.route("/seller")
def seller():
    return send_from_directory(os.path.join(FRONTEND_PATH, "seller"), "seller-dashboard.html")

@app.route("/user")
def user():
    return send_from_directory(os.path.join(FRONTEND_PATH, "user"), "user-dashboard.html")

if __name__ == "__main__":
    app.run(debug=True)
