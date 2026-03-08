# AI Code Analyzer

Lightweight web app that analyzes submitted code using a hosted AI model and helps track practice problems in a personal kanban. This repository contains a Flask backend (API + DB) and a React + Vite frontend.

**Repository layout**
- `backend/` — Flask API and DB models (`app.py`, `check_models.py`)
- `frontend/` — React + Vite single-page app
- `requirements.txt` — Python dependencies for backend

**Quick setup**

1. Backend (Python)

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r ..\requirements.txt
```

Create a `.env` in `backend/` with the following variables (example):

```
DATABASE_URL=sqlite:///app.db
JWT_SECRET_KEY=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
HF_TOKEN=your_huggingface_token
GEMINI_API_KEY=your_google_gemini_key
```

Run backend locally:

```bash
cd backend
python app.py
```

The backend will create the database tables on first run (`db.create_all()` in `app.py`).

2. Frontend (Node)

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in the frontend environment if the API is not at the default `http://localhost:5000/api`.

**API endpoints**
- `POST /api/signup` — create user (body: `email`, `password`)
- `POST /api/login` — login (body: `email`, `password`) → returns access token
- `POST /api/google-login` — login via Google token (body: `token`)
- `POST /api/review` — submit code for analysis (JWT required)
- `GET /api/history` — get user's review history (JWT required)
- `GET|POST /api/problems` — list or add problems (JWT required)
- `PUT|DELETE /api/problems/<id>` — update or delete a problem (JWT required)

**Notes & tips**
- `requirements.txt` is at the repo root—install with `pip install -r requirements.txt` when activating the backend venv.
- For production, run the backend with a WSGI server such as `gunicorn` and use a proper RDBMS (Postgres) instead of SQLite.
- Keep secrets out of source control. Use a `.env` and a secrets manager for deployments.

If you want, I can pin exact package versions in `requirements.txt`, add a `docker-compose.yml`, or create a `Makefile` to simplify dev commands.
