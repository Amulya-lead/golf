import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
    const { user } = useAuth();
    const [performanceBoard, setPerformanceBoard] = useState([]);
    const [philanthropyBoard, setPhilanthropyBoard] = useState([]);
    const [activeTab, setActiveTab] = useState('performance');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadBoard() {
            // Get first day of current month
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            // Fetch Top Golfers
            const { data: scoreData } = await supabase.from('scores')
                .select('*, profiles(name, avatar_initials)')
                .gte('date', firstDay)
                .order('total_stableford', { ascending: false })
                .limit(20);

            // Fetch Top Philanthropists
            const { data: philData } = await supabase.from('profiles')
                .select('name, avatar_initials, total_contributed')
                .order('total_contributed', { ascending: false })
                .limit(20);

            if (scoreData) {
                setPerformanceBoard(scoreData.map(d => ({
                    ...d,
                    player: d.profiles?.name || 'Unknown',
                    initials: d.profiles?.avatar_initials || '?',
                    course: d.course_name,
                    stableford: d.total_stableford,
                    strokes: d.total_strokes
                })));
            }

            if (philData) {
                setPhilanthropyBoard(philData.map(d => ({
                    player: d.name || 'Unknown',
                    initials: d.avatar_initials || '?',
                    amount: d.total_contributed
                })));
            }

            setLoading(false);
        }
        loadBoard();
    }, []);

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();

    const renderBadge = (index) => {
        if (index === 0) return <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 0 10px gold)' }}>👑</span>;
        if (index === 1) return <span style={{ fontSize: '1.3rem' }}>🥈</span>;
        if (index === 2) return <span style={{ fontSize: '1.2rem' }}>🥉</span>;
        return `#${index + 1}`;
    };

    return (
        <div className="page">
            <div className="container" style={{ paddingBottom: '4rem' }}>
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 className="page-title">🏆 Global Leaderboard</h1>
                            <p className="page-subtitle">{months[now.getMonth()]} {now.getFullYear()} · Who is making the biggest impact?</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '50px' }}>
                            <button
                                onClick={() => setActiveTab('performance')}
                                className={`btn ${activeTab === 'performance' ? 'btn-primary btn-shimmer' : 'btn-ghost'}`}
                                style={{ borderRadius: '50px', padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}
                            >
                                🏌️‍♂️ Top Golfers
                            </button>
                            <button
                                onClick={() => setActiveTab('philanthropy')}
                                className={`btn ${activeTab === 'philanthropy' ? 'btn-primary btn-shimmer' : 'btn-ghost'}`}
                                style={{ borderRadius: '50px', padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}
                            >
                                💚 Philanthropists
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-center"><div className="spinner" /></div>
                ) : activeTab === 'performance' && performanceBoard.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛳</div>
                        <h3>No scores this month yet</h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Be the first to submit a round!</p>
                    </div>
                ) : (
                    <div className="table-wrap glass" style={{ animation: 'revealUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                        <table>
                            <thead>
                                {activeTab === 'performance' ? (
                                    <tr><th>Rank</th><th>Player</th><th>Course</th><th>Stableford</th><th>Strokes</th><th>HCP</th><th>Date</th></tr>
                                ) : (
                                    <tr><th>Rank</th><th>Philanthropist</th><th>Total Lifetime Impact</th><th>Status</th></tr>
                                )}
                            </thead>
                            <tbody>
                                {(activeTab === 'performance' ? performanceBoard : philanthropyBoard).map((p, i) => (
                                    <tr key={i} style={{ background: p.player === user?.name ? 'rgba(201,168,76,0.1)' : undefined, transition: 'all 0.3s ease' }}>
                                        <td style={{ fontWeight: 800, fontFamily: 'Outfit' }}>
                                            {renderBadge(i)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    background: i === 0 ? 'linear-gradient(135deg, #f1c40f, #f39c12)' : 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                                                    boxShadow: i === 0 ? '0 0 20px rgba(241, 196, 15, 0.5)' : 'none',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1rem', fontWeight: 800, color: '#080b12',
                                                }}>
                                                    {p.initials}
                                                </div>
                                                <span style={{ fontWeight: p.player === user?.name ? 800 : 500, fontSize: i === 0 ? '1.1rem' : '1rem', color: i === 0 ? 'var(--gold)' : '#fff' }}>
                                                    {p.player} {p.player === user?.name && <span className="badge badge-gold" style={{ fontSize: '0.65rem', marginLeft: '0.5rem' }}>You</span>}
                                                </span>
                                            </div>
                                        </td>
                                        {activeTab === 'performance' ? (
                                            <>
                                                <td style={{ color: 'var(--text-secondary)' }}>{p.course}</td>
                                                <td><span className="badge badge-gold" style={{ fontSize: '1rem', padding: '0.4rem 0.8rem' }}>{p.stableford} pts</span></td>
                                                <td>{p.strokes}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{p.handicap}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{new Date(p.date).toLocaleDateString('en-GB')}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td>
                                                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#4cd137', textShadow: i === 0 ? '0 0 10px rgba(76, 209, 55, 0.4)' : 'none' }}>
                                                        £{p.amount?.toFixed(2) || '0.00'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge badge-green" style={{ background: i === 0 ? 'rgba(76, 209, 55, 0.2)' : 'rgba(255,255,255,0.05)' }}>
                                                        {i === 0 ? '💎 Diamond Donor' : i < 5 ? '🏆 Gold Elite' : '🌟 Community Legend'}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
