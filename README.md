# CodeMentor AI — Intelligent Code Review & Learning Platform

> A full-stack SaaS application that provides AI-powered code analysis, personalized learning roadmaps, and interview preparation tooling for software engineers.

**Live Demo:** [code-mentor-app.vercel.app](https://code-mentor-app.vercel.app) &nbsp;|&nbsp; **Backend API:** [code-mentor-pi.vercel.app](https://code-mentor-pi.vercel.app/api/health)

---

## Problem Statement

Software engineers preparing for technical interviews lack immediate, personalized feedback on their code quality. Generic resources don't explain *why* a solution is suboptimal or *what* to practice next. CodeMentor solves this by combining AI-driven code analysis with an adaptive learning system that tracks progress and surfaces targeted practice problems.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│         React 18 + Vite (Vercel CDN — global edge)          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / JWT Bearer
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│     Flask REST API (Vercel Serverless — Python runtime)     │
│   Rate limiting · CORS · JWT auth · Input validation        │
└──────┬────────────────────┬────────────────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐   ┌────────────────────────────────────────┐
│  MySQL DB    │   │           AI Inference Layer            │
│  (Aiven)     │   │  Hugging Face Inference Router          │
│              │   │  Qwen2.5-Coder-32B-Instruct (LLM)      │
│  Users       │   │  · Tiered hint system (3 levels)        │
│  Reviews     │   │  · Structured JSON output               │
│  Problems    │   │  · Complexity analysis                  │
└──────────────┘   └────────────────────────────────────────┘
```

---

## Key Features

| Feature | Technical Implementation |
|---|---|
| AI Code Review | Structured prompting of Qwen2.5-Coder-32B via HF Inference Router; JSON schema enforcement; markdown fence stripping |
| Tiered Hints | 3-level pedagogy system (Socratic nudge → directional hint → full review); prompt selected at request time |
| Smart Kanban | Auto-populates Todo board from AI-recommended problems; optimistic UI updates; drag-free status transitions |
| Learning Vault | Paginated review history with search, collapsible diffs, and AI quality feedback (👍/👎 signal) |
| Streak Tracking | Daily active tracking with streak reset logic; surface via `/api/insights` dashboard endpoint |
| Auth System | Dual-mode: email/bcrypt + Google OAuth2; stateless JWT (7-day expiry); protected routes on both layers |
| Response Cache | Code-snippet deduplication cache scoped per-user; eliminates redundant AI calls for identical submissions |
| Keep-Alive | Frontend pings `/api/health` every 4 minutes; eliminates Vercel serverless cold-start latency (~1.3s → ~200ms) |

---

## Technical Stack

**Backend**
- Python 3.11 / Flask 3.0
- SQLAlchemy ORM with safe auto-migration (column addition without data loss)
- Flask-JWT-Extended — stateless authentication
- Flask-Limiter — per-IP and per-route rate limiting (30 req/hr on AI endpoint)
- Flask-CORS — origin-locked with 24-hour preflight caching (`max_age=86400`)
- PyMySQL — MySQL connector with SSL enforcement
- Deployed as serverless functions on Vercel

**Frontend**
- React 18 + Vite (HMR, tree-shaking, chunk splitting)
- React Router v6 — client-side routing with protected route guards
- Recharts — dynamic asymptotic growth visualization (Big-O chart generation)
- Deployed on Vercel edge CDN

**Infrastructure & Data**
- MySQL 8.0 on Aiven (cloud-managed, SSL-enforced)
- Vercel — frontend CDN + backend serverless (separate deployments)
- Hugging Face Inference Router — managed LLM inference endpoint
- Google OAuth 2.0 — federated identity

---

## API Design

```
POST   /api/signup                     Register user (bcrypt hashed)
POST   /api/login                      Authenticate → JWT
POST   /api/google-login               Google OAuth token exchange → JWT

POST   /api/review                     Submit code for AI analysis
         body: { code, problem_title, problem_url, hint_level: 1|2|3 }
         → { analysis, cached, hint_level }

POST   /api/review/:id/feedback        Record thumbs up/down on AI quality
GET    /api/history?limit&offset&topic Paginated review history with filters
GET    /api/insights                   User stats: streak, solved count, totals
GET    /api/health                     Keep-alive probe (used by frontend ping)

GET    /api/problems?status=           Kanban board — filter by status
POST   /api/problems                   Add problem manually
PUT    /api/problems/:id               Update status/title/url
DELETE /api/problems/:id               Remove from board
```

All protected routes require `Authorization: Bearer <JWT>`. Rate limits: signup 10/hr, login 20/hr, review 30/hr.

---

## Engineering Decisions & Trade-offs

**Why serverless (Vercel) over a persistent server?**
Zero-ops deployment fits a solo project. Trade-off: cold starts (~1.3s). Mitigated with a client-side keep-alive ping to `/api/health` every 4 minutes, reducing cold start frequency to near zero for active users.

**Why per-user cache scoping?**
Initial implementation cached by code snippet globally — any user submitting identical code would receive another user's cached analysis. Fixed by scoping `Review.query.filter_by(code_snippet=..., user_id=...)`. Critical for privacy if users ever submit proprietary code.

**Why tiered hints over direct answers?**
Research in pedagogical CS education (SIGCSE) shows learners who receive direct solutions have 40% lower retention than those guided through Socratic questioning. Three hint levels let users choose their own learning depth.

**Why Hugging Face over OpenAI?**
Qwen2.5-Coder-32B is a code-specialized model that outperforms GPT-3.5 on HumanEval benchmarks. HF Inference Router provides a unified endpoint with model fallback — no vendor lock-in.

**Why `max_age=86400` on CORS?**
The original implementation triggered CORS preflight on every API call, doubling round-trip count (6 network requests visible in DevTools instead of 3). Setting a 24-hour preflight cache eliminated the OPTIONS overhead after the first page load.

---

## Performance Optimizations

- **Parallel API calls** — `Promise.all([/api/problems, /api/history])` after login; cuts dashboard load from ~2.1s → ~1.1s
- **Optimistic UI updates** — Kanban status changes reflect instantly in local state before server confirmation
- **CORS preflight caching** — `max_age=86400` eliminates repeated OPTIONS requests after first load
- **Keep-alive pinging** — maintains warm serverless container; eliminates cold-start penalty for active sessions
- **Input size guard** — 15,000 character limit on code submissions prevents token cost explosion and timeout

---

## Security Measures

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens expire after 7 days; stateless — no server-side session storage
- CORS locked to explicit origin allowlist (no wildcard in credentialed mode)
- Per-route rate limiting via Flask-Limiter prevents AI cost abuse
- Input validation on all endpoints (size limits, type checks, status enum validation)
- Google OAuth token verified server-side via `google.oauth2.id_token.verify_oauth2_token`
- SSL enforced on all database connections

---

## Running Locally

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Create backend/.env
DATABASE_URL=mysql+pymysql://user:pass@localhost:3306/codementor
JWT_SECRET_KEY=your-secret-key
HF_TOKEN=your-huggingface-token
GOOGLE_CLIENT_ID=your-google-client-id
FRONTEND_ORIGIN=http://localhost:5173

python app.py   # runs on :5000, auto-migrates DB schema on first start

# Frontend
cd frontend
npm install
# Create frontend/.env.local
# VITE_API_BASE_URL=http://localhost:5000
npm run dev     # runs on :5173
```

---

## Database Schema

```sql
CREATE TABLE user (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  email         VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  streak_days   INT DEFAULT 0,
  last_active   DATE
);

CREATE TABLE review (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  user_id       INT NOT NULL REFERENCES user(id),
  code_snippet  TEXT NOT NULL,
  analysis_data TEXT NOT NULL,        -- JSON: complexity, feedback, roadmap
  tags          VARCHAR(255),         -- e.g. "dp,graph,off-by-one"
  helpful       BOOLEAN,              -- user feedback signal
  timestamp     DATETIME DEFAULT NOW()
);

CREATE TABLE problem (
  id        INT PRIMARY KEY AUTO_INCREMENT,
  user_id   INT NOT NULL REFERENCES user(id),
  title     VARCHAR(255) NOT NULL,
  url       VARCHAR(500),
  status    VARCHAR(50) DEFAULT 'Todo',   -- Todo | Unsolved | Solved
  timestamp DATETIME DEFAULT NOW()
);
```

---

## What I'd Build Next

- **Monaco Editor + Piston API** — in-browser code execution; eliminates tab-switching to test solutions
- **Interview simulation mode** — 45-min timer, AI acts as interviewer with follow-up questions, end-of-session scorecard
- **Mistake pattern recognition** — `GROUP BY tags` query surfaces recurring weak areas after 5+ reviews
- **SEO problem pages** — static routes (`/problems/two-sum`) with cached AI explanations; organic search traffic
- **Flask-Migrate** — replace the manual `ALTER TABLE` migration approach with versioned schema migrations

---

## Project Stats

- **27 commits** across a 2-week build
- **9 REST API endpoints** with JWT auth, rate limiting, and input validation
- **3 database tables** with relational integrity and safe schema migration
- **~950 lines** of production Python + ~750 lines of React
- **Languages:** JavaScript 65.7% · Python 30.6% · CSS 2.9% · HTML 0.8%

---

*Built by [Himanshu Gupta](https://github.com/himanshugupta09) — B.Tech Information Technology, 2024*
