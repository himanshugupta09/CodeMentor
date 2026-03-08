import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ==========================================
// COMPONENT 0: The SaaS Landing Page
// ==========================================
function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
      {/* Navigation Bar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 5%', backgroundColor: 'white', borderBottom: '1px solid #eaeaea' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111' }}>🧠 CodeMentor AI</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Log in</button>
          <button onClick={() => navigate('/signup')} style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Sign Up Free</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ textAlign: 'center', padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', letterSpacing: '-0.05em', color: '#111', lineHeight: '1.1', marginBottom: '1.5rem' }}>
          Master Algorithms with an <span style={{ color: '#0070f3' }}>AI Senior Engineer</span>.
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2.5rem', lineHeight: '1.6' }}>
          Stop guessing why your code is slow. Get instant Time & Space complexity analysis, professional feedback, and an auto-generated Kanban roadmap to crush your next technical interview.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/signup')} style={{ padding: '14px 28px', fontSize: '1.1rem', backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' }}>
            Start Analyzing Now
          </button>
        </div>
      </header>

      {/* Features Section */}
      <section style={{ padding: '4rem 5%', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', backgroundColor: 'white', borderTop: '1px solid #eaeaea' }}>
        <div style={{ flex: '1 1 300px', padding: '2rem', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px solid #eaeaea' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111' }}>Asymptotic Analysis</h3>
          <p style={{ color: '#666', lineHeight: '1.5' }}>Instant Big-O notation breakdowns for Time and Space complexity, visualized with interactive growth charts.</p>
        </div>
        <div style={{ flex: '1 1 300px', padding: '2rem', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px solid #eaeaea' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111' }}>Smart Kanban Tracker</h3>
          <p style={{ color: '#666', lineHeight: '1.5' }}>The AI recommends specific LeetCode problems based on your code and automatically adds them to your To-Do list.</p>
        </div>
        <div style={{ flex: '1 1 300px', padding: '2rem', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px solid #eaeaea' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111' }}>Enterprise Security</h3>
          <p style={{ color: '#666', lineHeight: '1.5' }}>Built with Python Flask, MySQL, Bcrypt password hashing, and stateless JWT authentication.</p>
        </div>
      </section>
    </div>
  );
}

// ==========================================
// COMPONENT 1: The Authentication Screen
// ==========================================
function AuthScreen({ setToken, initialMode }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Sync state if URL changes between /login and /signup
  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const endpoint = isLogin ? '/api/login' : '/api/signup';

    try {
      const response = await fetch(`http://code-mentor-10f65kg2o-himanshus-projects-219f5ecf.vercel.app${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');

      if (isLogin) {
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        navigate('/dashboard'); 
      } else {
        navigate('/login');
        setError('Signup successful! Please log in with your new credentials.');
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
      const response = await fetch('http://code-mentor-10f65kg2o-himanshus-projects-219f5ecf.vercel.app/api/google-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Google Auth failed');

      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      navigate('/dashboard');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
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
        
        {error && <div style={{ color: '#ef4444', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }} />
          <button type="submit" disabled={loading} style={{ padding: '12px', backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '0.5rem' }}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px', color: '#666' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
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
            onClick={() => alert('Google Login is configured for your local execution environment. For this preview, please use the standard email/password login.')} 
            style={{ padding: '10px 20px', backgroundColor: '#fff', color: '#757575', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
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
// COMPONENT 2: The Main Dashboard
// ==========================================
function Dashboard({ token, setToken }) {
  const [code, setCode] = useState('');
  const [problemTitle, setProblemTitle] = useState('');
  const [problemUrl, setProblemUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState([]);
  const navigate = useNavigate();

  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); navigate('/'); };

  const generateChartData = (complexityStr) => {
    let complexity = 'n'; 
    const match = complexityStr.match(/O\(([^)]+)\)/i);
    if (match) complexity = match[1].toLowerCase().replace(/\s/g, '');
    const data = [];
    for (let i = 1; i <= 10; i++) {
      let y = i; 
      if (complexity === '1') y = 1;
      else if (complexity === 'logn' || complexity === 'log(n)') y = Math.log2(i + 1);
      else if (complexity === 'n') y = i;
      else if (complexity === 'nlogn' || complexity === 'nlog(n)') y = i * Math.log2(i + 1);
      else if (complexity === 'n^2' || complexity === 'n*n') y = i * i;
      else if (complexity === '2^n') y = Math.pow(2, i);
      data.push({ name: `N=${i}`, Operations: parseFloat(y.toFixed(2)) });
    }
    setChartData(data);
  };

  const submitCode = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(''); setAnalysis(null); setChartData([]);
    try {
      const response = await fetch('http://code-mentor-10f65kg2o-himanshus-projects-219f5ecf.vercel.app/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code, problem_title: problemTitle, problem_url: problemUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to analyze code.');
      setAnalysis(data.analysis);
      if (data.analysis.time_complexity) generateChartData(data.analysis.time_complexity);
    } catch (err) {
      if (err.message.includes('Token') || err.message.includes('token')) handleLogout();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0' }}>🧠 CodeMentor Dashboard</h1>
          <p style={{ color: '#666', margin: 0 }}>Paste your code below for architectural review.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/tracker')} style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>📋 Kanban Tracker</button>
          <button onClick={() => navigate('/history')} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>📚 Vault</button>
          <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <input type="text" placeholder="Problem Title (e.g., Two Sum)" value={problemTitle} onChange={(e) => setProblemTitle(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
        <input type="text" placeholder="Problem URL (Optional)" value={problemUrl} onChange={(e) => setProblemUrl(e.target.value)} style={{ flex: 2, padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
      </div>

      <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste your C++, Java, or Python code here..." style={{ width: '100%', height: '300px', padding: '1rem', fontFamily: 'monospace', fontSize: '15px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }} />
      <button onClick={submitCode} disabled={loading} style={{ marginTop: '1rem', padding: '14px 24px', fontSize: '16px', fontWeight: 'bold', backgroundColor: loading ? '#555' : '#0070f3', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}>
        {loading ? 'Analyzing Architecture & Updating Kanban Board...' : 'Analyze Code'}
      </button>

      {error && <div style={{ color: '#ef4444', marginTop: '1rem', padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '6px' }}><strong>Error:</strong> {error}</div>}

      {analysis && (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: '600' }}>✓ Analysis complete. Recommended problems have been added to your To-Do list.</span>
            <button onClick={() => navigate('/tracker')} style={{ padding: '10px 24px', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>Open Kanban Tracker ➔</button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #0070f3' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '14px', textTransform: 'uppercase' }}>Time Complexity</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{analysis.time_complexity}</p>
            </div>
            <div style={{ flex: '1', minWidth: '200px', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #10b981' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '14px', textTransform: 'uppercase' }}>Space Complexity</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{analysis.space_complexity}</p>
            </div>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Engineer's Feedback</h2>
            <p style={{ lineHeight: '1.6', fontSize: '16px' }}>{analysis.feedback}</p>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {chartData.length > 0 && (
              <div style={{ flex: '1 1 400px', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h2 style={{ marginTop: 0, fontSize: '1.2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Asymptotic Growth</h2>
                <div style={{ width: '100%', height: '250px', marginTop: '1rem' }}><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" stroke="#6b7280" fontSize={12} /><YAxis stroke="#6b7280" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb' }} itemStyle={{ color: '#0070f3' }}/><Line type="monotone" dataKey="Operations" stroke="#0070f3" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></div>
              </div>
            )}
            <div style={{ flex: '1 1 300px', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ marginTop: 0, fontSize: '1.2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Learning Roadmap</h2>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>{analysis.roadmap && analysis.roadmap.map((step, idx) => (<li key={idx} style={{ marginBottom: '10px' }}>{step}</li>))}</ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 3: Problem Tracker
// ==========================================
function ProblemTracker({ token, setToken }) {
  const [problems, setProblems] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProblems = async () => {
    try {
      const response = await fetch('http://code-mentor-10f65kg2o-himanshus-projects-219f5ecf.vercel.app/api/problems', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok) setProblems(data.problems);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };
  useEffect(() => { fetchProblems(); }, []);

  const handleAddProblem = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const response = await fetch('http://code-mentor-10f65kg2o-himanshus-projects-219f5ecf.vercel.app/api/problems', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle, url: newUrl, status: 'Todo' })
      });
      if (response.ok) { setNewTitle(''); setNewUrl(''); fetchProblems(); }
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await fetch(`http://code-mentor-10f65kg2o-himanshus-projects-219f5ecf.vercel.app/api/problems/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      fetchProblems();
    } catch (err) { console.error(err); }
  };

  const deleteProblem = async (id) => {
    try {
      await fetch(`http://code-mentor-10f65kg2o-himanshus-projects-219f5ecf.vercel.app/api/problems/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      fetchProblems();
    } catch (err) { console.error(err); }
  };

  const renderColumn = (title, status, bgColor, borderColor) => {
    const colProblems = problems.filter(p => p.status === status);
    return (
      <div style={{ flex: 1, minWidth: '300px', backgroundColor: bgColor, borderRadius: '8px', padding: '1rem', border: `1px solid ${borderColor}` }}>
        <h3 style={{ marginTop: 0, borderBottom: `2px solid ${borderColor}`, paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
          {title} <span style={{ backgroundColor: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '14px' }}>{colProblems.length}</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {colProblems.map(p => (
            <div key={p.id} style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3', textDecoration: 'none' }}>{p.title} ↗</a> : p.title}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {status !== 'Todo' && <button onClick={() => updateStatus(p.id, 'Todo')} style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }}>⬅ Todo</button>}
                  {status !== 'Unsolved' && <button onClick={() => updateStatus(p.id, 'Unsolved')} style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', border: '1px solid #fcd34d', backgroundColor: '#fef3c7', borderRadius: '4px' }}>Attempt ⚙️</button>}
                  {status !== 'Solved' && <button onClick={() => updateStatus(p.id, 'Solved')} style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', border: '1px solid #6ee7b7', backgroundColor: '#d1fae5', borderRadius: '4px' }}>Solve ✓</button>}
                </div>
                <button onClick={() => deleteProblem(p.id)} style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', color: '#ef4444' }}>🗑️</button>
              </div>
            </div>
          ))}
          {colProblems.length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: '14px' }}>Empty list.</p>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0' }}>📋 Kanban Problem Tracker</h1>
          <p style={{ color: '#666', margin: 0 }}>AI recommendations and your personal Todo list.</p>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Back to CodeMentor</button>
      </div>

      <form onSubmit={handleAddProblem} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <input type="text" placeholder="Add new problem (e.g., Valid Palindrome)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <input type="text" placeholder="URL (Optional)" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add to Todo</button>
      </form>

      {loading ? <p>Loading board...</p> : (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {renderColumn('To-Do', 'Todo', '#f3f4f6', '#d1d5db')}
          {renderColumn('Attempting / AI Suggested', 'Unsolved', '#fffbeb', '#fde68a')}
          {renderColumn('Solved', 'Solved', '#ecfdf5', '#a7f3d0')}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 4: History Vault
// ==========================================
function HistoryDashboard({ token, setToken }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('http://code-mentor-10f65kg2o-himanshus-projects-219f5ecf.vercel.app/api/history', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        if (response.ok) setHistory(data.history);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchHistory();
  }, [token, setToken]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0' }}>📚 My Learning Vault</h1>
          <p style={{ color: '#666', margin: 0 }}>Review your past submissions.</p>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Back to CodeMentor</button>
      </div>

      {loading ? <p>Loading your vault...</p> : history.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <p>You haven't analyzed any code yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {history.map((item) => (
            <div key={item.id} style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 'bold', color: '#0070f3' }}>{new Date(item.date).toLocaleDateString()}</span>
                <span style={{ fontSize: '14px', color: '#666' }}>Time: {item.analysis.time_complexity} | Space: {item.analysis.space_complexity}</span>
              </div>
              <pre style={{ padding: '1rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '14px', overflowX: 'auto' }}>{item.code}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 5: The Router App
// ==========================================
function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!token ? <LandingPage /> : <Navigate to="/dashboard" />} />
        <Route path="/login" element={!token ? <AuthScreen setToken={setToken} initialMode="login" /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!token ? <AuthScreen setToken={setToken} initialMode="signup" /> : <Navigate to="/dashboard" />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={token ? <Dashboard token={token} setToken={setToken} /> : <Navigate to="/login" />} />
        <Route path="/history" element={token ? <HistoryDashboard token={token} setToken={setToken} /> : <Navigate to="/login" />} />
        <Route path="/tracker" element={token ? <ProblemTracker token={token} setToken={setToken} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;