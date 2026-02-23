from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
from passlib.context import CryptContext
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
db = client["new_numbering"]
collection = db["feely"]
users_collection = db["users"]

# Security Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkeyshouldbechanginproduction")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Auth Utilities ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

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
    new_reading = {
        "reading_type": data.get("reading_type"),
        "value": data.get("value"),
        "bpm": data.get("bpm"),
        "timestamp": data.get("timestamp"),
        "user_id": current_user["email"]
    }
    result = collection.insert_one(new_reading)
    return jsonify({"message": "Reading saved securely!", "id": str(result.inserted_id)})

@app.route('/api/readings', methods=['GET'])
@token_required
def get_readings(current_user):
    readings = list(collection.find({"user_id": current_user["email"]}, {"_id": 0}))
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

if __name__ == '__main__':
    app.run()
