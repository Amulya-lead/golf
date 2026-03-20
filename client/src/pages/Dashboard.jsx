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

                // Streak Logic
                const now = new Date();
                const lastActivity = user.lastActivityAt ? new Date(user.lastActivityAt) : null;
                let newStreak = user.currentStreak || 0;

                if (!lastActivity) {
                    newStreak = 1;
                } else {
                    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const lastDate = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
                    const daysSince = Math.round((todayDate - lastDate) / (24 * 60 * 60 * 1000));

                    if (daysSince === 1) {
                        newStreak += 1;
                    } else if (daysSince > 1) {
                        newStreak = 1; // broken
                    }
                }

                if (!lastActivity || now.getDate() !== lastActivity.getDate() || now.getMonth() !== lastActivity.getMonth() || now.getFullYear() !== lastActivity.getFullYear()) {
                    await supabase.from('profiles').update({ current_streak: newStreak, last_activity_at: now.toISOString() }).eq('id', user.id);
                }
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

    const quotes = [
        "The best way to find yourself is to lose yourself in the service of others. — Mahatma Gandhi",
        "No one has ever become poor by giving. — Anne Frank",
        "It's not how much we give but how much love we put into giving. — Mother Teresa",
        "We make a living by what we get, but we make a life by what we give. — Winston Churchill",
        "Golf is the closest game to the game we call life. You get bad breaks from good shots; you get good breaks from bad shots... but you have to play the ball where it lies. — Bobby Jones"
    ];
    // Pick a stable quote for the day based on date
    const todayQuote = quotes[new Date().getDate() % quotes.length];


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

                {/* 22 Ultimate Polish - Platform Pulse Ticker */}
                <div style={{ marginBottom: '1.5rem', background: 'rgba(201, 168, 76, 0.05)', border: '1px solid rgba(201, 168, 76, 0.2)', borderRadius: '12px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                    <div style={{ fontWeight: 800, color: 'var(--gold)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', paddingRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '8px', height: '8px', background: '#4cd137', borderRadius: '50%', boxShadow: '0 0 8px #4cd137', animation: 'pulse 2s infinite' }}></span>
                        Live Pulse
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative' }}>
                        <div style={{ display: 'inline-block', paddingLeft: '100%', animation: 'marquee 35s linear infinite' }}>
                            <span style={{ marginRight: '3rem' }}>🎉 <strong style={{ color: '#fff' }}>Sarah M.</strong> just locked in a 14-day streak!</span>
                            <span style={{ marginRight: '3rem' }}>⛳ <strong style={{ color: '#fff' }}>David R.</strong> posted a brilliant 41 pts at Pebble Beach.</span>
                            <span style={{ marginRight: '3rem' }}>💚 Someone just contributed <strong className="gold-text">£100</strong> to Ocean Rescue!</span>
                            <span style={{ marginRight: '3rem' }}>🏌️‍♂️ The Prize Pool just rolled over £5,000 for this month's draw.</span>
                            <span style={{ marginRight: '3rem' }}>🏆 <strong style={{ color: '#fff' }}>Emma W.</strong> climbed into the Top 10 Golfers globally.</span>
                            <span style={{ marginRight: '3rem' }}>✨ 12 new members joined the charity movement today.</span>
                        </div>
                    </div>
                </div>

                {/* 22 Ultimate Polish - Impact Story Banner */}
                <Link to="/impact-story" style={{ display: 'block', textDecoration: 'none', marginBottom: '2.5rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.1), rgba(201, 168, 76, 0.3))', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--gold)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '10rem', opacity: 0.1, transform: 'rotate(-10deg)', pointerEvents: 'none' }}>✨</div>
                        <div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginBottom: '0.2rem' }}>Play Your 2026 Impact Story</h3>
                            <p style={{ color: 'var(--gold-light)', margin: 0 }}>Tap to see your personalized year in review.</p>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                            ▶
                        </div>
                    </div>
                </Link>

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
                                {/* 21 Advanced Wow Features - Tangible Impact Visualizer */}
                                <div style={{ background: 'var(--gold)', color: '#000', padding: '1rem', borderRadius: '14px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '4rem', opacity: 0.15, transform: 'rotate(15deg)' }}>
                                        {user.selectedCharity.category.includes('health') ? '💊' :
                                            user.selectedCharity.category.includes('education') ? '🏌️‍♂️' :
                                                user.selectedCharity.category.includes('environment') ? '🌲' : '🍲'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem', opacity: 0.8 }}>Your Real-World Impact</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, lineHeight: 1.2 }}>
                                        {user.selectedCharity.category.includes('health') ? `Funded ${Math.floor((user.totalContributed || 0) / 10)} research hours` :
                                            user.selectedCharity.category.includes('education') ? `Provided ${Math.floor((user.totalContributed || 0) / 15)} youth lessons` :
                                                user.selectedCharity.category.includes('environment') ? `Planted ${Math.floor((user.totalContributed || 0) / 5)} protected trees` :
                                                    `Served ${Math.floor((user.totalContributed || 0) / 5)} community meals`}
                                    </div>
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

                {/* 20 Engagement Features - Motivation & Streak */}
                <div className="card glass-gold" style={{ marginTop: '3rem', padding: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>📅</span> Daily Motivation
                        </h3>
                        <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1.05rem', marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid var(--gold)' }}>
                            {todayQuote}
                        </p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', minWidth: '150px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Current Streak</div>
                        <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, textShadow: '0 0 20px rgba(201, 168, 76, 0.4)' }} className="gold-text">
                            {user?.currentStreak || 0} <span style={{ fontSize: '1.5rem' }}>🔥</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Days Active</div>
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
