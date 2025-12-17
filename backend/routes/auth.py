from flask import Blueprint, jsonify, request, session
import secrets
import re
import bcrypt
from sqlalchemy import func
from models import db, User

auth_bp = Blueprint('auth_bp', __name__)

# Email validation regex pattern (RFC 5322 simplified)
EMAIL_PATTERN = re.compile(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against its bcrypt hash."""
    try:
        password_bytes = password.encode('utf-8')
        hash_bytes = stored_hash.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except (ValueError, TypeError):
        return False


def is_valid_email(email: str) -> bool:
    """Validate email format using regex pattern."""
    return bool(EMAIL_PATTERN.match(email))



@auth_bp.route('/api/auth/signup', methods=['POST'])
def signup():
    """Authentication disabled"""
    return jsonify({"error": "Authentication is disabled"}), 404


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    """Authentication disabled"""
    return jsonify({"error": "Authentication is disabled"}), 404


@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    """Authentication disabled"""
    return jsonify({"error": "Authentication is disabled"}), 404


@auth_bp.route('/api/auth/session', methods=['GET'])
def get_session():
    """Authentication disabled"""
    return jsonify({
        "authenticated": False,
        "user": None
    })
