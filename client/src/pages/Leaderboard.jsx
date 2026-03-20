import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
    const { user } = useAuth();
    const [board, setBoard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadBoard() {
            // Get first day of current month
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            const { data } = await supabase.from('scores')
                .select('*, profiles(name, avatar_initials)')
                .gte('date', firstDay)
                .order('total_stableford', { ascending: false })
                .limit(20);

            if (data) {
                setBoard(data.map(d => ({
                    ...d,
                    player: d.profiles?.name || 'Unknown',
                    initials: d.profiles?.avatar_initials || '?',
                    course: d.course_name,
                    stableford: d.total_stableford,
                    strokes: d.total_strokes
                })));
            }
            setLoading(false);
        }
        loadBoard();
    }, []);

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();

    return (
        <div className="page">
            <div className="container" style={{ paddingBottom: '4rem' }}>
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 className="page-title">🏆 Leaderboard</h1>
                            <p className="page-subtitle">{months[now.getMonth()]} {now.getFullYear()} · Stableford Rankings</p>
                        </div>
                        <div className="badge badge-gold" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                            🔄 Resets every month
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-center"><div className="spinner" /></div>
                ) : board.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛳</div>
                        <h3>No scores this month yet</h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Be the first to submit a round!</p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr><th>Rank</th><th>Player</th><th>Course</th><th>Stableford</th><th>Strokes</th><th>HCP</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                    {board.map((p, i) => (
                                        <tr key={i} style={{ background: p.player === user?.name ? 'rgba(201,168,76,0.05)' : undefined }}>
                                            <td style={{ fontWeight: 800, fontFamily: 'Outfit' }}>
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.75rem', fontWeight: 700, color: '#080b12',
                                                    }}>
                                                        {p.initials || p.player?.[0] || '?'}
                                                    </div>
                                                    <span style={{ fontWeight: p.player === user?.name ? 700 : 400 }}>
                                                        {p.player} {p.player === user?.name && <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>You</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{p.course}</td>
                                            <td><span className="badge badge-gold">{p.stableford} pts</span></td>
                                            <td>{p.strokes}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{p.handicap}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{new Date(p.date).toLocaleDateString('en-GB')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
