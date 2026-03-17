import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://code-mentor-pi.vercel.app';
// ==========================================
// KEEP-ALIVE: ping backend every 4 min to prevent Vercel cold starts
// ==========================================
function useKeepAlive() {
  useEffect(() => {
    const ping = () => fetch(`${API_BASE}/api/health`).catch(() => {});
    ping(); // immediate ping on first load
    const id = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
}

// ==========================================
// EXAMPLE CODE for onboarding — shown to first-time users
// ==========================================
const EXAMPLE_CODE = `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`;

const EXAMPLE_TITLE = 'Two Sum';
const EXAMPLE_URL   = 'https://leetcode.com/problems/two-sum/';

// ==========================================
// SHARED FETCH HELPER with auth headers
// ==========================================
function authHeaders(token) {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

// ==========================================
// COMPONENT 0: Landing Page
// ==========================================
function LandingPage() {
  const navigate = useNavigate();
  useKeepAlive();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 5%', backgroundColor: 'white', borderBottom: '1px solid #eaeaea' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111' }}>🧠 CodeMentor AI</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Log in</button>
          <button onClick={() => navigate('/signup')} style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Sign Up Free</button>
        </div>
      </nav>

      <header style={{ textAlign: 'center', padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', letterSpacing: '-0.05em', color: '#111', lineHeight: '1.1', marginBottom: '1.5rem' }}>
          Master Algorithms with an <span style={{ color: '#0070f3' }}>AI Senior Engineer</span>.
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2.5rem', lineHeight: '1.6' }}>
          Get instant Big-O analysis, tiered hints that teach rather than just answer, and an auto-generated Kanban roadmap to crush your next technical interview.
        </p>
        <button onClick={() => navigate('/signup')} style={{ padding: '14px 28px', fontSize: '1.1rem', backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          Start Analyzing Now
        </button>
      </header>

      <section style={{ padding: '4rem 5%', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', backgroundColor: 'white', borderTop: '1px solid #eaeaea' }}>
        {[
          { icon: '🎯', title: 'Tiered Hints', desc: 'Choose your level — a gentle nudge, algorithmic direction, or full review. Learn at your own pace.' },
          { icon: '📊', title: 'Asymptotic Analysis', desc: 'Instant Big-O notation breakdowns with interactive growth charts.' },
          { icon: '📋', title: 'Smart Kanban', desc: 'AI recommends LeetCode problems based on your code and auto-adds them to your board.' },
          { icon: '🔥', title: 'Streak Tracking', desc: 'Build a daily practice habit with streak tracking and progress insights.' },
        ].map(f => (
          <div key={f.title} style={{ flex: '1 1 260px', padding: '2rem', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px solid #eaeaea' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#111' }}>{f.title}</h3>
            <p style={{ color: '#666', lineHeight: '1.5', fontSize: '0.95rem' }}>{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

// ==========================================
// COMPONENT 1: Auth Screen
// ==========================================
function AuthScreen({ setToken, initialMode }) {
  const [isLogin, setIsLogin]   = useState(initialMode === 'login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  useKeepAlive();

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const endpoint = isLogin ? '/api/login' : '/api/signup';
    try {
      const res  = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      if (isLogin) {
        localStorage.setItem('token', data.access_token);
        if (data.streak_days) localStorage.setItem('streak', data.streak_days);
        setToken(data.access_token);
        navigate('/dashboard');
      } else {
        navigate('/login');
        setError('Signup successful! Please log in.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API_BASE}/api/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google Auth failed');
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eaeaea', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
        <div style={{ textAlign: 'center', cursor: 'pointer', marginBottom: '2rem' }} onClick={() => navigate('/')}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>🧠 CodeMentor</span>
        </div>
        <h2 style={{ textAlign: 'center', marginTop: 0, marginBottom: '1.5rem', color: '#111' }}>
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h2>
        {error && (
          <div style={{ color: error.includes('successful') ? '#166534' : '#ef4444', padding: '10px', backgroundColor: error.includes('successful') ? '#dcfce7' : '#fee2e2', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }} />
          <input type="password" placeholder="Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }} />
          <button type="submit" disabled={loading} style={{ padding: '12px', backgroundColor: loading ? '#555' : '#111', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px', color: '#666' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span style={{ color: '#0070f3', cursor: 'pointer', fontWeight: '600' }} onClick={() => navigate(isLogin ? '/signup' : '/login')}>
            {isLogin ? 'Sign up' : 'Log in'}
          </span>
        </p>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
          <hr style={{ flex: 1, borderTop: '1px solid #eaeaea' }} />
          <span style={{ padding: '0 10px', color: '#888', fontSize: '14px' }}>OR</span>
          <hr style={{ flex: 1, borderTop: '1px solid #eaeaea' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => alert('Google Login is configured for production. Please use email/password for now.')}
            style={{ padding: '10px 20px', backgroundColor: '#fff', color: '#757575', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT 2: Stats Bar (streak + insights)
// ==========================================
function StatsBar({ token }) {
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/insights`, { headers: authHeaders(token) })
      .then(r => r.json())
      .then(d => setInsights(d))
      .catch(() => {});
  }, [token]);

  if (!insights) return null;

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      {[
        { label: '🔥 Streak', value: `${insights.streak_days} day${insights.streak_days !== 1 ? 's' : ''}` },
        { label: '📝 Reviews', value: insights.total_reviews },
        { label: '✅ Solved',  value: insights.solved_count },
        { label: '📋 To-Do',  value: insights.todo_count },
      ].map(s => (
        <div key={s.label} style={{ flex: '1 1 100px', padding: '0.75rem 1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>{s.label}</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111' }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// COMPONENT 3: Main Dashboard
// ==========================================
function Dashboard({ token, setToken }) {
  const [code, setCode]               = useState('');
  const [problemTitle, setProblemTitle] = useState('');
  const [problemUrl, setProblemUrl]   = useState('');
  const [hintLevel, setHintLevel]     = useState(3);
  const [analysis, setAnalysis]       = useState(null);
  const [reviewId, setReviewId]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [chartData, setChartData]     = useState([]);
  const [feedback, setFeedback]       = useState(null); // null | 'up' | 'down'
  const navigate = useNavigate();
  useKeepAlive();

  // Onboarding: pre-fill example for first-time users
  useEffect(() => {
    const isFirst = !localStorage.getItem('cm_visited');
    if (isFirst) {
      setCode(EXAMPLE_CODE);
      setProblemTitle(EXAMPLE_TITLE);
      setProblemUrl(EXAMPLE_URL);
      localStorage.setItem('cm_visited', '1');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('streak');
    setToken(null);
    navigate('/');
  };

  const generateChartData = useCallback((complexityStr) => {
    const match = complexityStr.match(/O\(([^)]+)\)/i);
    const c     = match ? match[1].toLowerCase().replace(/\s/g, '') : 'n';
    const data  = [];
    for (let i = 1; i <= 10; i++) {
      let y = i;
      if (c === '1')                         y = 1;
      else if (c === 'logn' || c === 'log(n)') y = Math.log2(i + 1);
      else if (c === 'n')                    y = i;
      else if (c === 'nlogn' || c === 'nlog(n)') y = i * Math.log2(i + 1);
      else if (c === 'n^2' || c === 'n*n')   y = i * i;
      else if (c === '2^n')                  y = Math.pow(2, i);
      data.push({ name: `N=${i}`, Operations: parseFloat(y.toFixed(2)) });
    }
    setChartData(data);
  }, []);

  const submitCode = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(''); setAnalysis(null); setChartData([]); setFeedback(null); setReviewId(null);
    try {
      const res  = await fetch(`${API_BASE}/api/review`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ code, problem_title: problemTitle, problem_url: problemUrl, hint_level: hintLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze code.');
      setAnalysis(data.analysis);
      if (data.review_id) setReviewId(data.review_id);
      if (data.analysis.time_complexity) generateChartData(data.analysis.time_complexity);
    } catch (err) {
      if (err.message.toLowerCase().includes('token')) handleLogout();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (helpful) => {
    if (!reviewId) return;
    setFeedback(helpful ? 'up' : 'down');
    try {
      await fetch(`${API_BASE}/api/review/${reviewId}/feedback`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ helpful }),
      });
    } catch (_) {}
  };

  const hintLabels = { 1: '💡 Nudge only', 2: '🧭 Direction', 3: '🔍 Full review' };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem 0' }}>🧠 CodeMentor</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Paste code for AI analysis. Choose your hint level below.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/tracker')} style={{ padding: '8px 14px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>📋 Kanban</button>
          <button onClick={() => navigate('/history')} style={{ padding: '8px 14px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>📚 Vault</button>
          <button onClick={handleLogout} style={{ padding: '8px 14px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
        </div>
      </div>

      {/* Stats */}
      <StatsBar token={token} />

      {/* Problem metadata */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Problem title (e.g. Two Sum)" value={problemTitle} onChange={e => setProblemTitle(e.target.value)} style={{ flex: 1, minWidth: '180px', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }} />
        <input type="text" placeholder="LeetCode URL (optional)" value={problemUrl} onChange={e => setProblemUrl(e.target.value)} style={{ flex: 2, minWidth: '180px', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }} />
      </div>

      {/* Hint level selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {[1, 2, 3].map(level => (
          <button
            key={level}
            onClick={() => setHintLevel(level)}
            style={{
              padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              border: hintLevel === level ? 'none' : '1px solid #e5e7eb',
              backgroundColor: hintLevel === level ? '#0070f3' : '#f9fafb',
              color: hintLevel === level ? 'white' : '#555',
              transition: 'all 0.15s'
            }}
          >
            {hintLabels[level]}
          </button>
        ))}
      </div>

      {/* Code textarea */}
      <textarea
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="Paste your C++, Java, or Python code here..."
        style={{ width: '100%', height: '280px', padding: '1rem', fontFamily: 'monospace', fontSize: '14px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '12px', color: code.length > 12000 ? '#ef4444' : '#9ca3af' }}>{code.length.toLocaleString()} / 15,000 chars</span>
      </div>

      <button
        onClick={submitCode}
        disabled={loading || code.length > 15000}
        style={{ padding: '13px 24px', fontSize: '15px', fontWeight: 'bold', backgroundColor: loading ? '#555' : '#0070f3', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}
      >
        {loading ? 'Analyzing...' : `Analyze Code — ${hintLabels[hintLevel]}`}
      </button>

      {error && (
        <div style={{ color: '#ef4444', marginTop: '1rem', padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Analysis results */}
      {analysis && (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Success banner — FIX: correct route /tracker not /tracker */}
          <div style={{ padding: '1rem 1.5rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontWeight: '600' }}>✓ Analysis complete. Problems added to your Kanban board.</span>
            <button onClick={() => navigate('/tracker')} style={{ padding: '8px 20px', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              Open Kanban ➔
            </button>
          </div>

          {/* Complexity cards */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '180px', padding: '1.25rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #0070f3' }}>
              <h3 style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Time Complexity</h3>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>{analysis.time_complexity}</p>
            </div>
            <div style={{ flex: 1, minWidth: '180px', padding: '1.25rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #10b981' }}>
              <h3 style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Space Complexity</h3>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>{analysis.space_complexity}</p>
            </div>
          </div>

          {/* Feedback / hint content */}
          {(analysis.hint || analysis.nudge) && (
            <div style={{ padding: '1.25rem', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <h2 style={{ marginTop: 0, fontSize: '1rem', color: '#92400e' }}>💡 Mentor's Hint</h2>
              {analysis.hint   && <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>{analysis.hint}</p>}
              {analysis.nudge  && <p style={{ margin: 0, lineHeight: 1.6, color: '#78350f' }}><em>{analysis.nudge}</em></p>}
            </div>
          )}

          {analysis.feedback && (
            <div style={{ padding: '1.25rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ marginTop: 0, fontSize: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>Engineer's Feedback</h2>
              <p style={{ lineHeight: 1.6, margin: 0 }}>{analysis.feedback}</p>
              {analysis.optimized_approach && (
                <p style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', lineHeight: 1.5, fontSize: '14px', color: '#166534' }}>
                  <strong>Optimal approach:</strong> {analysis.optimized_approach}
                </p>
              )}
            </div>
          )}

          {/* Chart + roadmap */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {chartData.length > 0 && (
              <div style={{ flex: '1 1 380px', padding: '1.25rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h2 style={{ marginTop: 0, fontSize: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>Asymptotic Growth</h2>
                <div style={{ width: '100%', height: '220px', marginTop: '0.75rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                      <YAxis stroke="#6b7280" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb' }} />
                      <Line type="monotone" dataKey="Operations" stroke="#0070f3" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {analysis.roadmap && analysis.roadmap.length > 0 && (
              <div style={{ flex: '1 1 260px', padding: '1.25rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h2 style={{ marginTop: 0, fontSize: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>Learning Roadmap</h2>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, margin: 0 }}>
                  {analysis.roadmap.map((step, i) => <li key={i} style={{ marginBottom: '6px', fontSize: '14px' }}>{step}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* AI feedback quality signal */}
          <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Was this analysis helpful?</span>
            {feedback ? (
              <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>Thanks for the feedback!</span>
            ) : (
              <>
                <button onClick={() => submitFeedback(true)}  style={{ padding: '5px 14px', borderRadius: '20px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontSize: '16px' }}>👍</button>
                <button onClick={() => submitFeedback(false)} style={{ padding: '5px 14px', borderRadius: '20px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontSize: '16px' }}>👎</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 4: Kanban Problem Tracker
// ==========================================
function ProblemTracker({ token }) {
  const [problems, setProblems] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl]     = useState('');
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  const fetchProblems = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/problems`, { headers: authHeaders(token) });
      const data = await res.json();
      if (res.ok) setProblems(data.problems);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/problems`, {
        method: 'POST', headers: authHeaders(token),
        body: JSON.stringify({ title: newTitle, url: newUrl, status: 'Todo' }),
      });
      if (res.ok) { setNewTitle(''); setNewUrl(''); fetchProblems(); }
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await fetch(`${API_BASE}/api/problems/${id}`, {
        method: 'PUT', headers: authHeaders(token),
        body: JSON.stringify({ status: newStatus }),
      });
      // Optimistic update
      setProblems(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (e) { console.error(e); }
  };

  const deleteProblem = async (id) => {
    try {
      await fetch(`${API_BASE}/api/problems/${id}`, { method: 'DELETE', headers: authHeaders(token) });
      setProblems(prev => prev.filter(p => p.id !== id));
    } catch (e) { console.error(e); }
  };

  const renderColumn = (title, status, bg, border) => {
    const col = problems.filter(p => p.status === status);
    return (
      <div style={{ flex: 1, minWidth: '280px', backgroundColor: bg, borderRadius: '10px', padding: '1rem', border: `1px solid ${border}` }}>
        <h3 style={{ marginTop: 0, borderBottom: `2px solid ${border}`, paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px' }}>
          {title}
          <span style={{ backgroundColor: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>{col.length}</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {col.map(p => (
            <div key={p.id} style={{ backgroundColor: '#fff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>
                {p.url
                  ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3', textDecoration: 'none' }}>{p.title} ↗</a>
                  : p.title}
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {status !== 'Todo'     && <button onClick={() => updateStatus(p.id, 'Todo')}     style={btnStyle('#f3f4f6','#6b7280')}>⬅ Todo</button>}
                  {status !== 'Unsolved' && <button onClick={() => updateStatus(p.id, 'Unsolved')} style={btnStyle('#fffbeb','#d97706')}>⚙️ Attempt</button>}
                  {status !== 'Solved'   && <button onClick={() => updateStatus(p.id, 'Solved')}   style={btnStyle('#d1fae5','#059669')}>✓ Solved</button>}
                </div>
                <button onClick={() => deleteProblem(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '2px 4px' }}>🗑</button>
              </div>
            </div>
          ))}
          {col.length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: '13px', margin: '1rem 0' }}>Empty</p>}
        </div>
      </div>
    );
  };

  const btnStyle = (bg, color) => ({
    padding: '3px 10px', fontSize: '12px', cursor: 'pointer',
    border: `1px solid ${color}`, borderRadius: '4px', backgroundColor: bg, color, fontWeight: '500'
  });

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem 0' }}>📋 Kanban Tracker</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>AI-recommended problems + your personal todo list.</p>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>← Back to CodeMentor</button>
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Problem title" value={newTitle} onChange={e => setNewTitle(e.target.value)} required style={{ flex: '1 1 180px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }} />
        <input type="text" placeholder="URL (optional)" value={newUrl}   onChange={e => setNewUrl(e.target.value)}   style={{ flex: '2 1 180px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }} />
        <button type="submit" style={{ padding: '9px 20px', backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>+ Add</button>
      </form>

      {loading ? (
        <p style={{ color: '#6b7280', textAlign: 'center' }}>Loading board...</p>
      ) : (
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {renderColumn('📌 To-Do', 'Todo', '#f3f4f6', '#d1d5db')}
          {renderColumn('⚙️ Attempting', 'Unsolved', '#fffbeb', '#fde68a')}
          {renderColumn('✅ Solved', 'Solved', '#ecfdf5', '#a7f3d0')}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 5: History Vault
// ==========================================
function HistoryDashboard({ token, setToken }) {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // FIX: use Promise.all pattern for parallel fetches where applicable
    fetch(`${API_BASE}/api/history`, { headers: authHeaders(token) })
      .then(r => r.json())
      .then(d => { if (d.history) setHistory(d.history); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = history.filter(item =>
    !search || item.code.toLowerCase().includes(search.toLowerCase()) ||
    (item.analysis?.feedback || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem 0' }}>📚 Learning Vault</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Your past code reviews and AI analysis.</p>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>← Back</button>
      </div>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search by code or feedback..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', marginBottom: '1rem', boxSizing: 'border-box' }}
      />

      {loading ? (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading vault...</p>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280' }}>{history.length === 0 ? "You haven't analyzed any code yet. Head to the dashboard to start!" : 'No results match your search.'}</p>
          {history.length === 0 && <button onClick={() => navigate('/dashboard')} style={{ marginTop: '1rem', padding: '10px 20px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Analyze your first code</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(item => (
            <div key={item.id} style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {/* Collapsed header */}
              <div
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: expanded === item.id ? '#f9fafb' : '#fff' }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '600', color: '#0070f3', fontSize: '14px' }}>{new Date(item.date).toLocaleDateString()}</span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>⏱ {item.analysis.time_complexity}</span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>💾 {item.analysis.space_complexity}</span>
                  {item.helpful === true  && <span style={{ fontSize: '12px', color: '#10b981' }}>👍 Helpful</span>}
                  {item.helpful === false && <span style={{ fontSize: '12px', color: '#ef4444' }}>👎 Not helpful</span>}
                </div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>{expanded === item.id ? '▲ collapse' : '▼ expand'}</span>
              </div>

              {/* Expanded content */}
              {expanded === item.id && (
                <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e5e7eb' }}>
                  <pre style={{ padding: '0.85rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', overflowX: 'auto', margin: '0 0 1rem' }}>
                    {item.code}
                  </pre>
                  {item.analysis.feedback && (
                    <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#374151', margin: 0 }}>
                      <strong>Feedback:</strong> {item.analysis.feedback}
                    </p>
                  )}
                  {item.analysis.hint && (
                    <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#92400e', margin: '8px 0 0' }}>
                      <strong>Hint:</strong> {item.analysis.hint}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 6: App Router
// ==========================================
function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/"        element={!token ? <LandingPage /> : <Navigate to="/dashboard" />} />
        <Route path="/login"   element={!token ? <AuthScreen setToken={setToken} initialMode="login"  /> : <Navigate to="/dashboard" />} />
        <Route path="/signup"  element={!token ? <AuthScreen setToken={setToken} initialMode="signup" /> : <Navigate to="/dashboard" />} />

        {/* Protected */}
        <Route path="/dashboard" element={token ? <Dashboard       token={token} setToken={setToken} /> : <Navigate to="/login" />} />
        <Route path="/history"   element={token ? <HistoryDashboard token={token} setToken={setToken} /> : <Navigate to="/login" />} />
        <Route path="/tracker"   element={token ? <ProblemTracker   token={token} setToken={setToken} /> : <Navigate to="/login" />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={token ? '/dashboard' : '/'} />} />
      </Routes>
    </Router>
  );
}

export default App;
