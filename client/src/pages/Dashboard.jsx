import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const { user, refreshUser, cancelSubscription } = useAuth();
    const [scores, setScores] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [winnings, setWinnings] = useState({ total: 0, pending: 0, list: [] });
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.role === 'admin') {
            navigate('/admin');
            return;
        }

        async function loadDashboard() {
            try {
                if (!user) return;

                const [scoresRes, subRes, winningsRes, notifRes] = await Promise.all([
                    supabase.from('scores').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
                    supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
                    supabase.from('winners').select('*').eq('user_id', user.id),
                    supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
                ]);

                if (scoresRes.data) setScores(scoresRes.data);
                if (subRes.data) setSubscription(subRes.data);
                if (winningsRes.data) {
                    const total = winningsRes.data.reduce((acc, curr) => acc + (curr.status === 'paid' ? Number(curr.prize_amount) : 0), 0);
                    const pending = winningsRes.data.filter(w => w.status !== 'paid' && w.status !== 'rejected').length;
                    setWinnings({ total, pending, list: winningsRes.data });
                }
                if (notifRes.data) setNotifications(notifRes.data);

                await refreshUser();
            } catch (err) {
                console.error("Dashboard failed to load stats:", err);
            } finally {
                setLoading(false);
            }
        }
        loadDashboard();
    }, [user?.id]);

    const bestScore = scores.length ? Math.max(...scores.map(s => s.total_stableford)) : null;

    if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

    return (
        <div className="page">
            <div className="container" style={{ paddingBottom: '4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2.2rem', fontWeight: 900 }}>Welcome back, <span className="gold-text">{user?.name?.split(' ')[0]}</span></h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>Your personal impact & performance dashboard</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Link to="/results" className="btn btn-secondary btn-sm">Past Results</Link>
                        <Link to="/scores/new" className="btn btn-primary btn-sm btn-shimmer">+ Submit Score</Link>
                    </div>
                </div>

                <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
                    {[
                        { label: 'Draw Entries', value: user?.drawEntries ?? 0, icon: '✨', gold: true },
                        { label: 'Rounds Tracked', value: scores.length, icon: '📊', gold: false },
                        { label: 'Peak Performance', value: bestScore ? `${bestScore}pts` : '—', icon: '🏆', gold: true },
                        { label: 'Collective Impact', value: `£${(user?.totalContributed ?? 0).toFixed(2)}`, icon: '🌍', gold: false },
                    ].map((s, i) => (
                        <div key={i} className="card glass-gold">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div className="stat-card">
                                    <div className="stat-label">{s.label}</div>
                                    <div className={`stat-value ${s.gold ? 'gold' : ''}`} style={{ fontSize: '1.8rem' }}>{s.value}</div>
                                </div>
                                <span style={{ fontSize: '1.8rem', opacity: 0.8 }}>{s.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid-3">
                    {/* Subscription (13 Technical) */}
                    <div className="card glass">
                        <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1rem', letterSpacing: '0.05em' }}>💳 ACCOUNT STATUS</h3>
                        {subscription ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Membership</span>
                                    <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>✓ {subscription.plan}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Next Billing</span>
                                    <span style={{ fontWeight: 700 }}>{new Date(subscription.next_billing_date).toLocaleDateString('en-GB')}</span>
                                </div>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.6 }}
                                    onClick={async () => {
                                        if (confirm('Cancel membership?')) {
                                            await cancelSubscription();
                                            alert('Cancelled.');
                                        }
                                    }}
                                >
                                    Manage Subscription
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1rem' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Inactive Account</p>
                                <Link to="/pricing" className="btn btn-primary btn-sm btn-shimmer" style={{ width: '100%' }}>Activate Now</Link>
                            </div>
                        )}
                    </div>

                    {/* Charity Impact (12 Emotion) */}
                    <div className="card glass">
                        <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1rem', letterSpacing: '0.05em' }}>💚 YOUR IMPACT</h3>
                        {user?.selectedCharity ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ fontSize: '2.5rem' }}>{user.selectedCharity.logo_emoji || '🤝'}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{user.selectedCharity.name}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{user.selectedCharity.category.toUpperCase()}</div>
                                    </div>
                                    <Link to="/charities" className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}>Change</Link>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Monthly Gift</span>
                                        <strong className="gold-text">{user.charity_percentage || 10}%</strong>
                                    </div>
                                    <input
                                        type="range" min="10" max="50" step="5" value={user.charity_percentage || 10}
                                        onChange={async (e) => {
                                            const val = parseInt(e.target.value);
                                            const { error } = await supabase.from('profiles').update({ charity_percentage: val }).eq('id', user.id);
                                            if (!error) refreshUser();
                                        }}
                                        style={{ width: '100%', accentColor: 'var(--gold)', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                                <Link to="/charities" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Select Cause</Link>
                            </div>
                        )}
                    </div>

                    {/* Notifications (13 Technical) */}
                    <div className="card glass">
                        <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1rem', letterSpacing: '0.05em' }}>🔔 RECENT UPDATES</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {notifications.length > 0 ? notifications.map((n, i) => (
                                <div key={i} style={{ paddingBottom: '0.8rem', borderBottom: i < notifications.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                        {n.title}
                                        <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(n.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{n.message}</p>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>
                                    <p>No new alerts. We'll notify you of draw results and impact milestones here.</p>
                                </div>
                            )}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem', marginTop: '0.2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending Prize Payout</div>
                                    <span style={{ fontWeight: 800, color: 'var(--gold)' }}>£{winnings.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.4rem' }}>Recent Performance</h2>
                        <Link to="/leaderboard" className="btn btn-ghost btn-sm">Full Leaderboard →</Link>
                    </div>
                    {scores.length === 0 ? (
                        <div className="card glass" style={{ textAlign: 'center', padding: '4rem' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>✨</div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>Your journey starts with your first score.</p>
                            <Link to="/scores/new" className="btn btn-primary btn-shimmer">Begin Your Impact</Link>
                        </div>
                    ) : (
                        <div className="table-wrap glass">
                            <table>
                                <thead><tr><th>Course</th><th>Date</th><th>Impact Points</th><th>Strokes</th><th>HCP</th></tr></thead>
                                <tbody>
                                    {scores.slice(0, 5).map((s, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 700 }}>{s.course_name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{new Date(s.date).toLocaleDateString('en-GB')}</td>
                                            <td><span className="badge badge-gold">{s.total_stableford} pts</span></td>
                                            <td>{s.total_strokes}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{s.handicap}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
