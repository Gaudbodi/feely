from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import bcrypt
from jose import JWTError, jwt
from functools import wraps
import httpx

# Load secure environment variables
load_dotenv(override=True)

app = Flask(__name__, static_folder='static')
CORS(app)

# Connect to MongoDB
MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    print("WARNING: MONGODB_URI not set.")

client = MongoClient(MONGO_URI)
db = client["feely_ai"]
collection = db["feely"]
users_collection = db["users"]
invites_collection = db["invites"]
shared_access_collection = db["shared_access"]
access_logs_collection = db["access_logs"]

# Security Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkeyshouldbechanginproduction")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- Auth Utilities ---
def log_access(user_email, action, resource_owner, details=""):
    access_logs_collection.insert_one({
        "user_email": user_email,
        "action": action,
        "resource_owner": resource_owner,
        "details": details,
        "timestamp": datetime.utcnow()
    })
def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'detail': 'Token is missing!'}), 401
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if email is None:
                return jsonify({'detail': 'Token is invalid!'}), 401
            current_user = users_collection.find_one({"email": email})
            if current_user is None:
                return jsonify({'detail': 'User not found!'}), 401
        except Exception as e:
            return jsonify({'detail': f'Token is invalid! {str(e)}'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# --- Routes ---

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/token', methods=['POST'])
def login_for_access_token():
    # Flask handles form data in request.form
    username = request.form.get('username')
    password = request.form.get('password')
    
    user = users_collection.find_one({"email": username})
    if not user or not verify_password(password, user["hashed_password"]):
        return jsonify({"detail": "Incorrect username or password"}), 401
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return jsonify({"access_token": access_token, "token_type": "bearer"})

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if users_collection.find_one({"email": email}):
        return jsonify({"detail": "Email already registered"}), 400
    
    hashed_password = get_password_hash(password)
    user_db = {
        "email": email,
        "hashed_password": hashed_password,
        "disabled": False
    }
    users_collection.insert_one(user_db)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": email}, expires_delta=access_token_expires
    )
    return jsonify({"access_token": access_token, "token_type": "bearer"})

@app.route('/api/readings', methods=['POST'])
@token_required
def add_reading(current_user):
    data = request.json
    owner_email = data.get("owner_email")
    
    target_user = current_user["email"]
    if owner_email and owner_email != current_user["email"]:
        access = shared_access_collection.find_one({
            "owner_email": owner_email,
            "shared_with_email": current_user["email"],
            "permissions": "write"
        })
        if not access:
            return jsonify({"detail": "No write access to this account"}), 403
        target_user = owner_email
        log_access(current_user["email"], "write_reading", owner_email)

    new_reading = {
        "reading_type": data.get("reading_type"),
        "value": data.get("value"),
        "bpm": data.get("bpm"),
        "timestamp": data.get("timestamp"),
        "user_id": target_user,
        "created_by": current_user["email"]
    }
    result = collection.insert_one(new_reading)
    return jsonify({"message": "Reading saved securely!", "id": str(result.inserted_id)})

@app.route('/api/readings', methods=['GET'])
@token_required
def get_readings(current_user):
    owner_email = request.args.get("owner_email")
    
    target_user = current_user["email"]
    if owner_email and owner_email != current_user["email"]:
        access = shared_access_collection.find_one({
            "owner_email": owner_email,
            "shared_with_email": current_user["email"]
        })
        if not access:
            return jsonify({"detail": "No access to this account"}), 403
        target_user = owner_email
        log_access(current_user["email"], "read_readings", owner_email)

    readings = list(collection.find({"user_id": target_user}, {"_id": 0}))
    return jsonify({"readings": readings})

@app.route('/api/auth/google', methods=['POST'])
def google_login():
    token = request.json.get('token')
    # Simple validation stub
    try:
        response = httpx.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
        if response.status_code != 200:
             return jsonify({"detail": "Invalid Google Token"}), 400
        
        user_info = response.json()
        email = user_info.get("email")
        
        if not users_collection.find_one({"email": email}):
            user_db = {
                "email": email,
                "hashed_password": get_password_hash(os.urandom(24).hex()),
                "disabled": False
            }
            users_collection.insert_one(user_db)
            
        access_token = create_access_token(data={"sub": email})
        return jsonify({"access_token": access_token, "token_type": "bearer"})
    except Exception as e:
        return jsonify({"detail": str(e)}), 400

# --- Sharing API ---

@app.route('/api/invites', methods=['POST'])
@token_required
def create_invite(current_user):
    data = request.json
    permissions = data.get("permissions", "read") # "read" or "write"
    expiry_hours = int(data.get("expiry_hours", 24))
    
    token = str(uuid.uuid4())
    expiry = datetime.utcnow() + timedelta(hours=expiry_hours)
    
    invite = {
        "token": token,
        "inviter_email": current_user["email"],
        "permissions": permissions,
        "status": "pending",
        "expiry": expiry,
        "created_at": datetime.utcnow()
    }
    invites_collection.insert_one(invite)
    
    return jsonify({"invite_url": f"/invite/{token}", "token": token})

@app.route('/api/invites', methods=['GET'])
@token_required
def list_invites(current_user):
    invites = list(invites_collection.find({"inviter_email": current_user["email"]}, {"_id": 0}))
    for inv in invites:
        if inv["status"] == "pending" and inv["expiry"] < datetime.utcnow():
            inv["status"] = "expired"
    return jsonify({"invites": invites})

@app.route('/api/invites/accept', methods=['POST'])
@token_required
def accept_invite(current_user):
    token = request.json.get("token")
    invite = invites_collection.find_one({"token": token})
    
    if not invite:
        return jsonify({"detail": "Invite not found"}), 404
    
    if invite["status"] != "pending" or invite["expiry"] < datetime.utcnow():
        return jsonify({"detail": "Invite is no longer valid"}), 400
    
    if invite["inviter_email"] == current_user["email"]:
        return jsonify({"detail": "You cannot accept your own invite"}), 400

    shared_access_collection.update_one(
        {"owner_email": invite["inviter_email"], "shared_with_email": current_user["email"]},
        {"$set": {"permissions": invite["permissions"], "accepted_at": datetime.utcnow()}},
        upsert=True
    )
    
    invites_collection.update_one({"token": token}, {"$set": {"status": "accepted", "accepted_by": current_user["email"]}})
    
    log_access(current_user["email"], "accept_invite", invite["inviter_email"])
    
    return jsonify({"message": "Access granted", "owner_email": invite["inviter_email"]})

@app.route('/api/shared-with-me', methods=['GET'])
@token_required
def list_shared_with_me(current_user):
    shared = list(shared_access_collection.find({"shared_with_email": current_user["email"]}, {"_id": 0}))
    return jsonify({"shared": shared})

@app.route('/api/access-logs', methods=['GET'])
@token_required
def get_access_logs(current_user):
    logs = list(access_logs_collection.find({"resource_owner": current_user["email"]}, {"_id": 0}).sort("timestamp", -1).limit(50))
    return jsonify({"logs": logs})

if __name__ == '__main__':
    app.run()
