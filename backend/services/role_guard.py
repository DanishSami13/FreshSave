from flask import request, jsonify
from functools import wraps


def require_role(required_role):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            role = request.headers.get("Role")

            if not role:
                return jsonify({"error": "Role header missing"}), 403

            if role.lower() != required_role.lower():
                return jsonify({"error": "Unauthorized access"}), 403

            return func(*args, **kwargs)
        return wrapper
    return decorator
