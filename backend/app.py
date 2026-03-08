import os
import json
import requests
import datetime
import secrets
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from flask import Flask, request, jsonify, make_response

load_dotenv()

app = Flask(__name__)

# --- THE NUCLEAR CORS FIX ---
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    response = make_response()
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

@app.after_request
def add_cors_headers(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response
# ----------------------------
# Allow specific frontend origin and handle credentials/preflight
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
# --- Database & Auth Configuration ---
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY")

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# ==========================================
# DATABASE MODELS
# ==========================================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    reviews = db.relationship('Review', backref='author', lazy=True)
    problems = db.relationship('Problem', backref='solver', lazy=True)

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    code_snippet = db.Column(db.Text, nullable=False)
    analysis_data = db.Column(db.Text, nullable=False) 
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Problem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(50), nullable=False, default="Todo") # 'Solved', 'Unsolved', 'Todo'
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"error": "User already exists"}), 409

        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(email=email, password_hash=hashed_pw)
        db.session.add(new_user)
        db.session.commit()

        return jsonify({"message": "User created successfully", "email": email}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        user = User.query.filter_by(email=email).first()

        if user and bcrypt.check_password_hash(user.password_hash, password):
            access_token = create_access_token(identity=str(user.id))
            return jsonify({"message": "Login successful", "access_token": access_token}), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/google-login', methods=['POST'])
def google_login():
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({"error": "No token provided"}), 400

        client_id = os.getenv("GOOGLE_CLIENT_ID")
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        email = idinfo['email']

        user = User.query.filter_by(email=email).first()
        
        if not user:
            random_pw = secrets.token_urlsafe(32)
            hashed_pw = bcrypt.generate_password_hash(random_pw).decode('utf-8')
            user = User(email=email, password_hash=hashed_pw)
            db.session.add(user)
            db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        return jsonify({"message": "Google Login successful", "access_token": access_token}), 200

    except ValueError:
        return jsonify({"error": "Invalid Google token"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# CORE AI ROUTE & KANBAN AUTO-ADD LOGIC
# ==========================================
HF_TOKEN = os.getenv("HF_TOKEN")
API_URL = "https://router.huggingface.co/v1/chat/completions"

@app.route('/api/review', methods=['POST'])
@jwt_required()
def review_code():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    raw_code = data.get('code', '')
    problem_title = data.get('problem_title', '').strip()
    problem_url = data.get('problem_url', '').strip()

    if not raw_code.strip():
        return jsonify({"error": "No code provided"}), 400

    normalized_code = raw_code.strip()

    # 1. AUTO-ADD SOLVED: If the user provided a title, add it to their Solved list
    if problem_title:
        existing_solved = Problem.query.filter_by(user_id=current_user_id, title=problem_title).first()
        if not existing_solved:
            new_solved = Problem(user_id=current_user_id, title=problem_title, url=problem_url, status="Solved")
            db.session.add(new_solved)
            db.session.commit()
        else:
            # If it exists but wasn't marked Solved, update it
            if existing_solved.status != "Solved":
                existing_solved.status = "Solved"
                if problem_url: existing_solved.url = problem_url
                db.session.commit()

    # 2. THE CACHE CHECK
    existing_review = Review.query.filter_by(code_snippet=normalized_code).first()
    
    if existing_review:
        print("CACHE HIT! Serving instant response.")
        
        # Save to current user's history even on a cache hit
        new_history_entry = Review(
            user_id=current_user_id,
            code_snippet=normalized_code,
            analysis_data=existing_review.analysis_data
        )
        db.session.add(new_history_entry)
        db.session.commit()
        
        return jsonify({"analysis": json.loads(existing_review.analysis_data)}), 200

    # 3. CACHE MISS: CALL THE AI
    print("CACHE MISS. Calling Hugging Face AI...")
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json"
    }

    system_prompt = """
    You are a strict Senior Software Engineer and Mentor. Analyze the user's code.
    You MUST return ONLY a valid JSON object. Do not include markdown formatting like ```json.
    Format exactly like this:
    {
      "time_complexity": "O(...)",
      "space_complexity": "O(...)",
      "feedback": "1-2 sentences of technical feedback.",
      "roadmap": ["Step 1", "Step 2"],
      "recommended_problems": [
        {"name": "Problem Name", "url": "[https://leetcode.com/problems/](https://leetcode.com/problems/)..."}
      ]
    }
    """

    payload = {
        "model": "Qwen/Qwen2.5-Coder-32B-Instruct",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Review this code and generate a learning roadmap:\n\n{normalized_code}"}
        ],
        "max_tokens": 1000,
        "temperature": 0.2
    }

    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        
        if response.status_code == 429:
            return jsonify({"error": "The AI is currently helping too many engineers. Please try again in 60 seconds."}), 429
            
        response.raise_for_status()
        
        ai_message = response.json()['choices'][0]['message']['content'].strip()
        
        if ai_message.startswith("```json"):
            ai_message = ai_message[7:-3].strip()
        elif ai_message.startswith("```"):
            ai_message = ai_message[3:-3].strip()
            
        analysis_json = json.loads(ai_message)

        # Save to Vault
        new_review = Review(
            user_id=current_user_id,
            code_snippet=normalized_code,
            analysis_data=ai_message
        )
        db.session.add(new_review)

        # 4. AUTO-ADD UNSOLVED: Parse AI recommendations into the Database
        for rec in analysis_json.get("recommended_problems", []):
            rec_title = rec.get("name")
            rec_url = rec.get("url", "")
            if rec_title:
                existing_prob = Problem.query.filter_by(user_id=current_user_id, title=rec_title).first()
                if not existing_prob:
                    new_unsolved = Problem(user_id=current_user_id, title=rec_title, url=rec_url, status="Unsolved")
                    db.session.add(new_unsolved)

        db.session.commit()

        return jsonify({"analysis": analysis_json}), 200

    except requests.exceptions.HTTPError as err:
        return jsonify({"error": f"API Gateway Error: {str(err)}"}), 502
    except json.JSONDecodeError:
        return jsonify({"error": "AI returned malformed data. Please try again."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# HISTORY VAULT ROUTE
# ==========================================
@app.route('/api/history', methods=['GET'])
@jwt_required()
def get_history():
    current_user_id = get_jwt_identity()
    try:
        reviews = Review.query.filter_by(user_id=current_user_id).order_by(Review.timestamp.desc()).all()
        history_data = []
        for r in reviews:
            history_data.append({
                "id": r.id,
                "code": r.code_snippet,
                "analysis": json.loads(r.analysis_data),
                "date": r.timestamp.isoformat()
            })
        return jsonify({"history": history_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# NEW: KANBAN TRACKER ROUTES
# ==========================================
@app.route('/api/problems', methods=['GET', 'POST'])
@jwt_required()
def manage_problems():
    current_user_id = get_jwt_identity()
    
    if request.method == 'GET':
        problems = Problem.query.filter_by(user_id=current_user_id).order_by(Problem.timestamp.desc()).all()
        data = []
        for p in problems:
            data.append({
                "id": p.id,
                "title": p.title,
                "url": p.url,
                "status": p.status
            })
        return jsonify({"problems": data}), 200

    if request.method == 'POST':
        data = request.get_json()
        if not data.get('title'):
            return jsonify({"error": "Title is required"}), 400
            
        new_prob = Problem(
            user_id=current_user_id,
            title=data.get('title'),
            url=data.get('url', ''),
            status=data.get('status', 'Todo')
        )
        db.session.add(new_prob)
        db.session.commit()
        return jsonify({
            "message": "Problem added successfully", 
            "problem": {"id": new_prob.id, "title": new_prob.title, "url": new_prob.url, "status": new_prob.status}
        }), 201

@app.route('/api/problems/<int:problem_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def update_problem(problem_id):
    current_user_id = get_jwt_identity()
    problem = Problem.query.filter_by(id=problem_id, user_id=current_user_id).first()
    
    if not problem:
        return jsonify({"error": "Problem not found"}), 404

    if request.method == 'PUT':
        data = request.get_json()
        if 'status' in data:
            problem.status = data['status']
        if 'title' in data:
            problem.title = data['title']
        if 'url' in data:
            problem.url = data['url']
            
        db.session.commit()
        return jsonify({"message": "Problem updated successfully"}), 200

    if request.method == 'DELETE':
        db.session.delete(problem)
        db.session.commit()
        return jsonify({"message": "Problem deleted"}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Rebuilds schemas and adds the Problem table automatically
    app.run(debug=True, port=5000)