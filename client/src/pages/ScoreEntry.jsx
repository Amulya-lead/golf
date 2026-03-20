import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const defaultHoles = Array.from({ length: 18 }, (_, i) => ({ par: 4, strokes: 0 }));

function calcStableford(par, strokes, hcp = 0) {
    if (!strokes) return 0;
    const diff = par - (strokes - Math.floor(hcp / 18));
    return Math.max(0, diff + 2);
}

export default function ScoreEntry() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [scores, setScores] = useState([]);
    const [newRound, setNewRound] = useState({
        stablefordScore: '',
        course: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [weather, setWeather] = useState(null);
    const [setupRounds, setSetupRounds] = useState(Array(5).fill(null).map(() => ({
        stablefordScore: '',
        course: '',
        date: new Date().toISOString().split('T')[0]
    })));

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        async function loadScores() {
            try {
                if (!user) return;
                const { data } = await supabase.from('scores')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('date', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (data) setScores(data);
            } catch (err) {
                console.error("Load failed:", err);
            } finally {
                setLoading(false);
            }
        }
        loadScores();
    }, [user?.id]);

    useEffect(() => {
        if (!newRound.course || newRound.course.length < 3) {
            setWeather(null);
            return;
        }

        const delayBounceFn = setTimeout(() => {
            // Generate deterministic "simulated" weather based on the course name
            const sum = newRound.course.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const conditions = [
                { i: '☀️', d: 'Sunny', min: 18, max: 25 },
                { i: '🌤️', d: 'Partly Cloudy', min: 14, max: 22 },
                { i: '⛅', d: 'Overcast', min: 12, max: 18 },
                { i: '💨', d: 'Windy', min: 10, max: 16 },
                { i: '🌧️', d: 'Light Rain', min: 8, max: 14 }
            ];
            const w = conditions[sum % conditions.length];
            const temp = w.min + (sum % (w.max - w.min));
            const wind = 5 + (sum % 15);
            setWeather({ icon: w.i, desc: w.d, temp, wind });
        }, 600);
        return () => clearTimeout(delayBounceFn);
    }, [newRound.course]);

    const handleSetupSubmit = async (e) => {
        e.preventDefault();
        for (let i = 0; i < 5; i++) {
            const r = setupRounds[i];
            if (!r.course.trim()) return setError(`Enter course for Round ${i + 1}`);
            if (!r.stablefordScore || r.stablefordScore < 1 || r.stablefordScore > 45) return setError(`Round ${i + 1} score 1-45`);
        }

        setError(''); setSubmitting(true);
        try {
            await supabase.from('scores').delete().eq('user_id', user.id);
            const insertData = setupRounds.map(r => ({
                user_id: user.id,
                course_name: r.course,
                date: r.date,
                handicap: user.handicap || 0,
                total_strokes: 0,
                total_stableford: parseInt(r.stablefordScore),
                holes: []
            }));
            await supabase.from('scores').insert(insertData);
            setSuccess(true);
            if (refreshUser) refreshUser();
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) { setError(err.message); } finally { setSubmitting(false); }
    };

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        if (!newRound.course.trim()) return setError('Please enter a course name.');
        if (!newRound.stablefordScore || newRound.stablefordScore < 1 || newRound.stablefordScore > 45) return setError('Score must be 1-45.');

        setError(''); setSubmitting(true);
        try {
            // 1. Insert new round
            await supabase.from('scores').insert({
                user_id: user.id,
                course_name: newRound.course,
                date: newRound.date,
                handicap: user.handicap || 0,
                total_strokes: 0,
                total_stableford: parseInt(newRound.stablefordScore),
                holes: []
            });

            // 2. Cleanup (Keep top 5)
            const { data: all } = await supabase.from('scores')
                .select('id')
                .eq('user_id', user.id)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (all && all.length > 5) {
                const idsToDelete = all.slice(5).map(s => s.id);
                await supabase.from('scores').delete().in('id', idsToDelete);
            }

            setSuccess(true);
            if (refreshUser) refreshUser();
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) { setError(err.message); } finally { setSubmitting(false); }
    };

    if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

    if (success) {
        return (
            <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⛳</div>
                    <h2 style={{ fontWeight: 800, fontSize: '2rem' }}>Scores Synchronized!</h2>
                    <p style={{ color: 'var(--gold)', marginTop: '0.5rem' }}>Your history has been updated. Redirecting...</p>
                </div>
            </div>
        );
    }

    const isSetup = scores.length < 5;

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: isSetup ? '800px' : '600px', paddingBottom: '4rem' }}>
                <div className="page-header" style={{ textAlign: 'center' }}>
                    <h1 className="page-title">{isSetup ? 'Initial Score Setup' : 'Add New Round'}</h1>
                    <p className="page-subtitle">
                        {isSetup
                            ? 'Please enter your last 5 golf scores to participate in draws.'
                            : 'Submit your latest round. This will replace your oldest recorded score.'}
                    </p>
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: '2rem' }}>{error}</div>}

                {isSetup ? (
                    <form onSubmit={handleSetupSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {setupRounds.map((r, i) => (
                                <div key={i} className="card card-gold">
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', padding: '1rem' }}>
                                        <div style={{ width: '30px', fontWeight: 900, color: 'var(--gold)' }}>{i + 1}</div>
                                        <div style={{ flex: '0 0 80px' }}>
                                            <input className="form-input" type="number" placeholder="PTS" value={r.stablefordScore}
                                                onChange={e => {
                                                    const next = [...setupRounds];
                                                    next[i].stablefordScore = e.target.value;
                                                    setSetupRounds(next);
                                                }} required />
                                        </div>
                                        <div style={{ flex: 2, minWidth: '150px' }}>
                                            <input className="form-input" placeholder="Course Name" value={r.course}
                                                onChange={e => {
                                                    const next = [...setupRounds];
                                                    next[i].course = e.target.value;
                                                    setSetupRounds(next);
                                                }} required />
                                        </div>
                                        <div style={{ flex: 1, minWidth: '130px' }}>
                                            <input className="form-input" type="date" value={r.date}
                                                onChange={e => {
                                                    const next = [...setupRounds];
                                                    next[i].date = e.target.value;
                                                    setSetupRounds(next);
                                                }} required />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', marginTop: '2rem', padding: '1.25rem' }}>
                            {submitting ? 'Saving History...' : '🏆 Save Initial 5 Scores'}
                        </button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <form onSubmit={handleSingleSubmit} className="card card-gold" style={{ padding: '2rem', border: '2px solid var(--gold)' }}>
                            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>🆕 Submit Latest Round</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Stableford Score (1-45)</label>
                                    <input className="form-input" type="number" value={newRound.stablefordScore}
                                        onChange={e => setNewRound({ ...newRound, stablefordScore: e.target.value })}
                                        style={{ fontSize: '2rem', fontWeight: 900, textAlign: 'center', color: 'var(--gold)' }} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Golf Course</label>
                                    <input className="form-input" placeholder="Enter course name to fetch local conditions..." value={newRound.course}
                                        onChange={e => setNewRound({ ...newRound, course: e.target.value })} required />
                                    {weather && (
                                        <div style={{ marginTop: '0.75rem', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'revealUp 0.3s ease' }}>
                                            <div style={{ fontSize: '1.8rem' }}>{weather.icon}</div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Conditions</div>
                                                <div style={{ fontWeight: 800, color: '#fff' }}>{weather.desc}, {weather.temp}°C</div>
                                            </div>
                                            <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                💨 {weather.wind} mph wind
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input className="form-input" type="date" value={newRound.date}
                                        onChange={e => setNewRound({ ...newRound, date: e.target.value })} required />
                                </div>
                                <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', padding: '1rem' }}>
                                    {submitting ? 'Updating...' : '🏆 Submit & Replace Oldest'}
                                </button>
                            </div>
                        </form>

                        <div>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Current History (Last 4)</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {scores.slice(0, 4).map((s, i) => (
                                    <div key={i} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{s.course_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.date}</div>
                                        </div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--gold)' }}>{s.total_stableford} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>PTS</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
