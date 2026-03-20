import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const location = useLocation();
    const [loginMode, setLoginMode] = useState(location.state?.mode || 'user'); // 'user' or 'admin'
    const [form, setForm] = useState({ identifier: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    // Auto-redirect if already logged in based on role
    useEffect(() => {
        if (user) {
            navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            console.log("Submitting login form...");
            const { profile } = await login(form.identifier, form.password);

            // Short delay to ensure AuthContext state is fully settled
            setTimeout(() => {
                const target = profile?.role === 'admin' ? '/admin' : '/dashboard';
                console.log("Login success! Redirecting to:", target);
                navigate(target, { replace: true });
            }, 100);

        } catch (err) {
            console.error("Login Error:", err);
            setError(err.message || 'Login failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ width: '100%', maxWidth: '440px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '3rem' }}>{loginMode === 'admin' ? '🛡️' : '⛳'}</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>
                        {loginMode === 'admin' ? 'Admin Portal' : <>Welcome back to <span className="gold-text">GolfGives</span></>}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        {loginMode === 'admin' ? 'Sign in to manage the platform' : 'Sign in to your account'}
                    </p>
                </div>

                <div className="card card-gold" style={{ padding: '2.5rem' }}>
                    {error && <div className="alert alert-error">{error}</div>}

                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                        <button type="button" onClick={() => { setLoginMode('user'); setForm({ ...form, identifier: '' }); }}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: loginMode === 'user' ? 'var(--gold)' : 'transparent', color: loginMode === 'user' ? '#080b12' : 'var(--text-secondary)', fontWeight: 700, transition: 'var(--transition)' }}>
                            User Login
                        </button>
                        <button type="button" onClick={() => { setLoginMode('admin'); setForm({ ...form, identifier: '' }); }}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: loginMode === 'admin' ? 'var(--gold)' : 'transparent', color: loginMode === 'admin' ? '#080b12' : 'var(--text-secondary)', fontWeight: 700, transition: 'var(--transition)' }}>
                            Admin Access
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label className="form-label">Email or Username</label>
                            <input className="form-input" type="text" placeholder="you@example.com or coolgolfer"
                                value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input className="form-input" type="password" placeholder="••••••••"
                                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
                            {loading ? 'Entering Portal...' : 'Sign In →'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', fontSize: '1rem', marginTop: '1.5rem' }}>
                        <Link to="/register" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 700 }}>Sign up</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
