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
    """
    Register a new user account.
    Expects JSON body with: {"username": "...", "email": "...", "password": "..."}
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Missing request body"}), 400
    
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    # Validate required fields
    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required"}), 400
    
    # Validate username length
    if len(username) < 3 or len(username) > 30:
        return jsonify({"error": "Username must be between 3 and 30 characters"}), 400
    
    # Validate email format
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400
    
    # Validate password strength
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409
    
    # Check if username is taken
    if User.query.filter(func.lower(User.username) == username.lower()).first():
        return jsonify({"error": "Username is already taken"}), 409
    
    # Create user
    user_id = secrets.token_hex(16)
    new_user = User(
        id=user_id,
        username=username,
        email=email,
        password_hash=hash_password(password)
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    # Set session
    session['user_id'] = user_id
    session['username'] = username
    session['email'] = email
    
    return jsonify({
        "message": "Account created successfully",
        "user": new_user.to_dict()
    }), 201


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    """
    Log in an existing user.
    Expects JSON body with: {"email": "...", "password": "..."}
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Missing request body"}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    # Find user
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401
    
    # Verify password
    if not verify_password(password, user.password_hash):
        return jsonify({"error": "Invalid email or password"}), 401
    
    # Set session
    session['user_id'] = user.id
    session['username'] = user.username
    session['email'] = user.email
    
    return jsonify({
        "message": "Login successful",
        "user": user.to_dict()
    })


@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    """Log out the current user by clearing the session."""
    session.clear()
    return jsonify({"message": "Logged out successfully"})


@auth_bp.route('/api/auth/session', methods=['GET'])
def get_session():
    """
    Get the current session status.
    Returns user info if logged in, or null if not.
    """
    if 'user_id' in session:
        return jsonify({
            "authenticated": True,
            "user": {
                "id": session['user_id'],
                "username": session['username'],
                "email": session['email']
            }
        })
    
    return jsonify({
        "authenticated": False,
        "user": None
    })
