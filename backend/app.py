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

# Safe import — flask_limiter is optional; app works without it
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    LIMITER_AVAILABLE = True
except ImportError:
    LIMITER_AVAILABLE = False

# Safe import — google-auth is optional; only needed for Google OAuth
try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False

load_dotenv()

app = Flask(__name__)

# ==========================================
# CORS — single clean config
# Both Vercel URLs whitelisted so frontend on either domain works.
# max_age=86400 tells the browser to cache the preflight for 24 hours,
# eliminating the repeated OPTIONS calls you saw in the network tab.
# ==========================================
ALLOWED_ORIGINS = [
    "https://code-mentor-app.vercel.app",   # primary frontend
    "https://code-mentor-pi.vercel.app",    # secondary / old URL
    "http://localhost:5173",                 # local dev
    "http://localhost:3000",
]
# Also allow any extra origin set via env var (no need to redeploy for new domains)
extra = os.getenv("FRONTEND_ORIGIN", "")
if extra:
    ALLOWED_ORIGINS.append(extra)

CORS(app, resources={r"/api/*": {
    "origins": ALLOWED_ORIGINS,
    "supports_credentials": True,
    "max_age": 86400
}})

# ==========================================
# Rate limiting — no-op fallback if package missing
# ==========================================
if LIMITER_AVAILABLE:
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["500/day", "100/hour"],
        storage_uri="memory://"
    )
else:
    # Dummy limiter so @limiter.limit() decorators don't crash
    class _NoopLimiter:
        def limit(self, *a, **kw):
            return lambda f: f
        def exempt(self, f):
            return f
    limiter = _NoopLimiter()

# ==========================================
# App configuration
# ==========================================
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL", "sqlite:///app.db")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-prod")
# FIX: tokens were never expiring — set a reasonable window
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=7)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# ==========================================
# DATABASE MODELS
# ==========================================
class User(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    # Streak tracking — new fields
    streak_days   = db.Column(db.Integer, default=0)
    last_active   = db.Column(db.Date, nullable=True)
    reviews       = db.relationship('Review', backref='author', lazy=True)
    problems      = db.relationship('Problem', backref='solver', lazy=True)

class Review(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    code_snippet  = db.Column(db.Text, nullable=False)
    analysis_data = db.Column(db.Text, nullable=False)
    # Tags for mistake pattern recognition — e.g. "dp,off-by-one"
    tags          = db.Column(db.String(255), nullable=True)
    helpful       = db.Column(db.Boolean, nullable=True)   # AI feedback quality signal
    timestamp     = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Problem(db.Model):
    id        = db.Column(db.Integer, primary_key=True)
    user_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title     = db.Column(db.String(255), nullable=False)
    url       = db.Column(db.String(500), nullable=True)
    status    = db.Column(db.String(50), nullable=False, default="Todo")
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# ==========================================
# HELPERS
# ==========================================
def update_streak(user):
    """Update streak_days based on last_active date."""
    today = datetime.date.today()
    if user.last_active is None:
        user.streak_days = 1
    elif user.last_active == today:
        pass  # already counted today
    elif user.last_active == today - datetime.timedelta(days=1):
        user.streak_days = (user.streak_days or 0) + 1
    else:
        user.streak_days = 1   # streak broken
    user.last_active = today

# ==========================================
# HEALTH — keep-alive endpoint so Vercel doesn't cold-start
# Frontend should ping this every 4 minutes to keep the container warm.
# ==========================================
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.datetime.utcnow().isoformat()}), 200

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================
@app.route('/api/signup', methods=['POST'])
@limiter.limit("10/hour")
def signup():
    try:
        data     = request.get_json()
        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "User already exists"}), 409

        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user  = User(email=email, password_hash=hashed_pw)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User created successfully", "email": email}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
@limiter.limit("20/hour")
def login():
    try:
        data     = request.get_json()
        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')

        user = User.query.filter_by(email=email).first()
        if user and bcrypt.check_password_hash(user.password_hash, password):
            update_streak(user)
            db.session.commit()
            access_token = create_access_token(identity=str(user.id))
            return jsonify({
                "message":      "Login successful",
                "access_token": access_token,
                "streak_days":  user.streak_days
            }), 200
        return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/google-login', methods=['POST'])
@limiter.limit("20/hour")
def google_login():
    if not GOOGLE_AUTH_AVAILABLE:
        return jsonify({"error": "Google login is not configured on this server. Please use email/password."}), 503
    try:
        data  = request.get_json()
        token = data.get('token')
        if not token:
            return jsonify({"error": "No token provided"}), 400

        client_id = os.getenv("GOOGLE_CLIENT_ID")
        idinfo    = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        email     = idinfo['email'].strip().lower()

        user = User.query.filter_by(email=email).first()
        if not user:
            random_pw = secrets.token_urlsafe(32)
            hashed_pw = bcrypt.generate_password_hash(random_pw).decode('utf-8')
            user      = User(email=email, password_hash=hashed_pw)
            db.session.add(user)

        update_streak(user)
        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "message":      "Google Login successful",
            "access_token": access_token,
            "streak_days":  user.streak_days
        }), 200
    except ValueError:
        return jsonify({"error": "Invalid Google token"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# CORE AI ROUTE
# ==========================================
HF_TOKEN = os.getenv("HF_TOKEN")
API_URL   = "https://router.huggingface.co/v1/chat/completions"

# System prompts keyed by hint level (1 = nudge, 2 = direction, 3 = full review)
SYSTEM_PROMPTS = {
    1: """You are a coding mentor. The student has submitted code and wants a gentle hint.
DO NOT give the solution. Instead ask 1-2 Socratic questions that guide their thinking.
Return ONLY a valid JSON object (no markdown):
{
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "hint": "Your guiding question here — do not reveal the answer.",
  "nudge": "One-sentence conceptual direction without giving away the approach.",
  "roadmap": ["Thinking step 1", "Thinking step 2"],
  "recommended_problems": [{"name": "Problem Name", "url": "https://leetcode.com/problems/..."}]
}""",
    2: """You are a coding mentor. Give the student a directional hint — point toward the right algorithm or data structure without writing any code.
Return ONLY a valid JSON object (no markdown):
{
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "feedback": "Point toward the right approach (e.g. 'consider a two-pointer technique here'). No code.",
  "roadmap": ["Concrete step 1", "Concrete step 2", "Concrete step 3"],
  "recommended_problems": [{"name": "Problem Name", "url": "https://leetcode.com/problems/..."}]
}""",
    3: """You are a strict Senior Software Engineer and Mentor. Analyze the student's code fully.
Return ONLY a valid JSON object (no markdown):
{
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "feedback": "2-3 sentences of specific technical feedback including what is correct and what to improve.",
  "optimized_approach": "Brief description of the optimal solution if theirs is suboptimal.",
  "roadmap": ["Step 1", "Step 2", "Step 3"],
  "recommended_problems": [{"name": "Problem Name", "url": "https://leetcode.com/problems/..."}]
}"""
}

@app.route('/api/review', methods=['POST'])
@jwt_required()
@limiter.limit("30/hour")   # per-IP — prevents API cost runaway
def review_code():
    current_user_id = get_jwt_identity()
    data            = request.get_json()

    raw_code      = data.get('code', '')
    problem_title = data.get('problem_title', '').strip()
    problem_url   = data.get('problem_url', '').strip()
    hint_level    = int(data.get('hint_level', 3))   # 1=nudge, 2=direction, 3=full review

    if not raw_code.strip():
        return jsonify({"error": "No code provided"}), 400

    # FIX: input size guard — prevents token cost explosion
    if len(raw_code) > 15000:
        return jsonify({"error": "Code must be under 15,000 characters"}), 413

    normalized_code = raw_code.strip()
    hint_level      = max(1, min(3, hint_level))

    # Auto-add to Solved if title provided
    if problem_title:
        existing = Problem.query.filter_by(user_id=current_user_id, title=problem_title).first()
        if not existing:
            db.session.add(Problem(
                user_id=current_user_id, title=problem_title,
                url=problem_url, status="Solved"
            ))
        elif existing.status != "Solved":
            existing.status = "Solved"
            if problem_url:
                existing.url = problem_url
        db.session.commit()

    # FIX: Cache is now scoped to the current user — prevents cross-user data leakage
    existing_review = Review.query.filter_by(
        code_snippet=normalized_code,
        user_id=current_user_id
    ).first()

    if existing_review:
        return jsonify({
            "analysis":  json.loads(existing_review.analysis_data),
            "cached":    True,
            "hint_level": hint_level
        }), 200

    # Cache miss — call AI
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type":  "application/json"
    }

    payload = {
        "model": "Qwen/Qwen2.5-Coder-32B-Instruct",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPTS[hint_level]},
            {"role": "user",   "content": f"Review this code:\n\n{normalized_code}"}
        ],
        "max_tokens":  1000,
        "temperature": 0.2
    }

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=30)

        if response.status_code == 429:
            return jsonify({"error": "The AI is busy. Please try again in 60 seconds."}), 429
        response.raise_for_status()

        ai_message = response.json()['choices'][0]['message']['content'].strip()

        # Strip any accidental markdown code fences
        if ai_message.startswith("```json"):
            ai_message = ai_message[7:].rsplit("```", 1)[0].strip()
        elif ai_message.startswith("```"):
            ai_message = ai_message[3:].rsplit("```", 1)[0].strip()

        analysis_json = json.loads(ai_message)

        # Save to DB
        new_review = Review(
            user_id=current_user_id,
            code_snippet=normalized_code,
            analysis_data=ai_message
        )
        db.session.add(new_review)

        # Auto-add AI-recommended problems to Kanban (Unsolved)
        for rec in analysis_json.get("recommended_problems", []):
            rec_title = rec.get("name")
            rec_url   = rec.get("url", "")
            if rec_title:
                if not Problem.query.filter_by(user_id=current_user_id, title=rec_title).first():
                    db.session.add(Problem(
                        user_id=current_user_id, title=rec_title,
                        url=rec_url, status="Unsolved"
                    ))

        # Update streak on active review
        user = User.query.get(current_user_id)
        if user:
            update_streak(user)

        db.session.commit()

        return jsonify({
            "analysis":   analysis_json,
            "cached":     False,
            "hint_level": hint_level
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({"error": "AI timed out. Please try again."}), 504
    except requests.exceptions.HTTPError as err:
        return jsonify({"error": f"AI API error: {str(err)}"}), 502
    except json.JSONDecodeError:
        return jsonify({"error": "AI returned malformed data. Please try again."}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ==========================================
# AI REVIEW FEEDBACK — thumbs up/down on quality
# ==========================================
@app.route('/api/review/<int:review_id>/feedback', methods=['POST'])
@jwt_required()
def review_feedback(review_id):
    current_user_id = get_jwt_identity()
    review = Review.query.filter_by(id=review_id, user_id=current_user_id).first()
    if not review:
        return jsonify({"error": "Review not found"}), 404

    data = request.get_json()
    helpful = data.get('helpful')  # True or False
    if helpful is None:
        return jsonify({"error": "helpful field (true/false) required"}), 400

    review.helpful = bool(helpful)
    db.session.commit()
    return jsonify({"message": "Feedback recorded"}), 200

# ==========================================
# HISTORY VAULT
# ==========================================
@app.route('/api/history', methods=['GET'])
@jwt_required()
def get_history():
    current_user_id = get_jwt_identity()
    try:
        # Optional filter params
        topic  = request.args.get('topic')
        limit  = min(int(request.args.get('limit', 50)), 100)
        offset = int(request.args.get('offset', 0))

        query = Review.query.filter_by(user_id=current_user_id)
        if topic:
            query = query.filter(Review.tags.contains(topic))
        reviews = query.order_by(Review.timestamp.desc()).limit(limit).offset(offset).all()

        history_data = [{
            "id":         r.id,
            "code":       r.code_snippet,
            "analysis":   json.loads(r.analysis_data),
            "tags":       r.tags,
            "helpful":    r.helpful,
            "date":       r.timestamp.isoformat()
        } for r in reviews]

        return jsonify({"history": history_data, "total": len(history_data)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# PROGRESS / INSIGHTS
# ==========================================
@app.route('/api/insights', methods=['GET'])
@jwt_required()
def get_insights():
    """Return user stats: streak, total reviews, solved problems, weak topics."""
    current_user_id = get_jwt_identity()
    try:
        user         = User.query.get(current_user_id)
        total_reviews = Review.query.filter_by(user_id=current_user_id).count()
        solved_count  = Problem.query.filter_by(user_id=current_user_id, status="Solved").count()
        todo_count    = Problem.query.filter_by(user_id=current_user_id, status="Todo").count()

        return jsonify({
            "streak_days":    user.streak_days or 0,
            "last_active":    user.last_active.isoformat() if user.last_active else None,
            "total_reviews":  total_reviews,
            "solved_count":   solved_count,
            "todo_count":     todo_count,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# KANBAN TRACKER ROUTES
# ==========================================
@app.route('/api/problems', methods=['GET', 'POST'])
@jwt_required()
def manage_problems():
    current_user_id = get_jwt_identity()

    if request.method == 'GET':
        status_filter = request.args.get('status')
        query         = Problem.query.filter_by(user_id=current_user_id)
        if status_filter:
            query = query.filter_by(status=status_filter)
        problems = query.order_by(Problem.timestamp.desc()).all()
        return jsonify({"problems": [{
            "id":     p.id,
            "title":  p.title,
            "url":    p.url,
            "status": p.status
        } for p in problems]}), 200

    if request.method == 'POST':
        data = request.get_json()
        if not data.get('title', '').strip():
            return jsonify({"error": "Title is required"}), 400

        new_prob = Problem(
            user_id=current_user_id,
            title=data['title'].strip(),
            url=data.get('url', ''),
            status=data.get('status', 'Todo')
        )
        db.session.add(new_prob)
        db.session.commit()
        return jsonify({
            "message": "Problem added",
            "problem": {"id": new_prob.id, "title": new_prob.title,
                        "url": new_prob.url, "status": new_prob.status}
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
        valid_statuses = {'Todo', 'Unsolved', 'Solved'}
        if 'status' in data and data['status'] in valid_statuses:
            problem.status = data['status']
        if 'title' in data and data['title'].strip():
            problem.title = data['title'].strip()
        if 'url' in data:
            problem.url = data['url']
        db.session.commit()
        return jsonify({"message": "Problem updated"}), 200

    if request.method == 'DELETE':
        db.session.delete(problem)
        db.session.commit()
        return jsonify({"message": "Problem deleted"}), 200

# ==========================================
# ERROR HANDLERS
# ==========================================
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Too many requests. Please slow down."}), 429

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
