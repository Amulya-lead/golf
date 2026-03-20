import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const plans = [
    { id: 'monthly', label: 'Monthly', price: '£9.99', period: '/month', desc: 'Flexible. Cancel anytime.', popular: false },
    { id: 'yearly', label: 'Yearly', price: '£99.99', period: '/year', desc: 'Save 17% — best value', popular: true },
];

export default function Register() {
    const [step, setStep] = useState(1);
    const [authMode, setAuthMode] = useState('username'); // 'email' or 'username'
    const [form, setForm] = useState({ name: '', identifier: '', password: '', plan: 'monthly' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const referredBy = searchParams.get('ref');  // Capture ?ref=UUID from invite link

    useEffect(() => {
        if (user) navigate('/dashboard');
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (step === 1) {
            if (authMode === 'username' && form.identifier.includes('@')) {
                return setError('Usernames cannot contain an @ symbol.');
            }
            setStep(2);
            return;
        }
        setError(''); setLoading(true);
        try {
            await register(form.name, form.identifier, form.password, form.plan, referredBy);
            // We assume "Confirm Email" is turned OFF in Supabase if using Username mode.
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Registration failed.');
        } finally { setLoading(false); }
    };

    return (
        <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ width: '100%', maxWidth: '500px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '3rem' }}>⛳</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Join <span className="gold-text">GolfGives</span></h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>Step {step} of 2 — {step === 1 ? 'Your Details' : 'Choose Your Plan'}</p>
                </div>

                {referredBy && (
                    <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid var(--gold)', borderRadius: '10px', padding: '0.8rem 1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🎁</span>
                        <div>
                            <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.9rem' }}>You were invited by a friend!</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>You'll both get a bonus draw entry when you sign up.</div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: s <= step ? 'var(--gold)' : 'var(--border-subtle)', transition: 'var(--transition)' }} />
                    ))}
                </div>

                <div className="card card-gold" style={{ padding: '2.5rem' }}>
                    {error && <div className="alert alert-error">{error}</div>}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {step === 1 ? (
                            <>
                                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: 'var(--radius-md)' }}>
                                    <button type="button" onClick={() => { setAuthMode('username'); setForm({ ...form, identifier: '' }); }}
                                        style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: authMode === 'username' ? 'var(--gold)' : 'transparent', color: authMode === 'username' ? '#080b12' : 'var(--text-secondary)', fontWeight: 700 }}>
                                        Use Username
                                    </button>
                                    <button type="button" onClick={() => { setAuthMode('email'); setForm({ ...form, identifier: '' }); }}
                                        style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: authMode === 'email' ? 'var(--gold)' : 'transparent', color: authMode === 'email' ? '#080b12' : 'var(--text-secondary)', fontWeight: 700 }}>
                                        Use Email
                                    </button>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input className="form-input" placeholder="John Smith"
                                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{authMode === 'username' ? 'Username' : 'Email Address'}</label>
                                    <input className="form-input" type={authMode === 'username' ? 'text' : 'email'}
                                        placeholder={authMode === 'username' ? 'coolgolfer99' : 'you@example.com'}
                                        value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value.replace(/\s/g, '') })} required />
                                    {authMode === 'username' && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>No spaces allowed.</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <input className="form-input" type="password" placeholder="Min 6 characters"
                                        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} minLength={6} required />
                                </div>
                                <button className="btn btn-primary" type="submit">Continue →</button>
                            </>
                        ) : (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {plans.map(p => (
                                        <label key={p.id} style={{ cursor: 'pointer' }}>
                                            <div className="card" style={{
                                                padding: '1.25rem 1.5rem', cursor: 'pointer',
                                                border: form.plan === p.id ? '2px solid var(--gold)' : '1px solid var(--border-subtle)',
                                                background: form.plan === p.id ? 'var(--gold-dim)' : 'var(--bg-card)',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <strong style={{ fontFamily: 'Outfit', fontSize: '1.05rem' }}>{p.label}</strong>
                                                        {p.popular && <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>Best Value</span>}
                                                    </div>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{p.desc}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.4rem', color: form.plan === p.id ? 'var(--gold)' : 'var(--text-primary)' }}>{p.price}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.period}</div>
                                                </div>
                                            </div>
                                            <input type="radio" name="plan" value={p.id} checked={form.plan === p.id}
                                                onChange={e => setForm({ ...form, plan: e.target.value })} style={{ display: 'none' }} />
                                        </label>
                                    ))}
                                </div>
                                <div style={{ background: 'var(--gold-dim)', borderRadius: 'var(--radius-sm)', padding: '0.8rem 1rem', fontSize: '0.85rem', color: 'var(--gold)', display: 'flex', gap: '0.5rem' }}>
                                    <span>💳</span>
                                    <span>Mock payment — no real card required</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</button>
                                    <button className="btn btn-primary" type="submit" style={{ flex: 2 }} disabled={loading}>
                                        {loading ? 'Creating account...' : 'Activate Subscription →'}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Already a member? <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Sign in</Link>
                </div>
            </div>
        </div>
    );
}
