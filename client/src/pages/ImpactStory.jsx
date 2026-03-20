import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function ImpactStory() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [stats, setStats] = useState({ rounds: 0, topScore: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            if (!user) return;
            const { data } = await supabase.from('scores').select('total_stableford').eq('user_id', user.id);
            if (data) {
                setStats({
                    rounds: data.length,
                    topScore: data.length > 0 ? Math.max(...data.map(d => d.total_stableford)) : 0
                });
            }
            // Small artificial delay for dramatic loading effect
            setTimeout(() => setLoading(false), 800);
        }
        fetchStats();
    }, [user?.id]);

    const nextSlide = () => {
        if (currentSlide < 4) setCurrentSlide(curr => curr + 1);
        else navigate('/dashboard');
    };

    if (loading || !user) {
        return <div className="page loading-center" style={{ background: '#000' }}><div className="spinner" /></div>;
    }

    const charityName = user.selectedCharity?.name || "the community";
    const charityCat = user.selectedCharity?.category || 'general';
    const amount = user.totalContributed || 0;

    let realWorld = `Served ${Math.floor(amount / 5)} community meals`;
    if (charityCat.includes('health')) realWorld = `Funded ${Math.floor(amount / 10)} research hours`;
    if (charityCat.includes('education')) realWorld = `Provided ${Math.floor(amount / 15)} youth lessons`;
    if (charityCat.includes('environment')) realWorld = `Planted ${Math.floor(amount / 5)} protected trees`;

    const slides = [
        // Slide 0: Intro
        <div className="story-slide" key="0">
            <div style={{ animation: 'fadeUp 1s ease forwards' }}>
                <h3 style={{ color: 'var(--gold)', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '1rem', fontSize: '1rem' }}>GolfGives</h3>
                <h1 style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1, marginBottom: '2rem' }}>Your<br />Impact<br />Story.</h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Tap to see what we've achieved together.</p>
            </div>
        </div>,

        // Slide 1: Golf Stats
        <div className="story-slide" key="1" style={{ background: 'var(--green)' }}>
            <div style={{ animation: 'fadeUp 1s ease forwards' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⛳</div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>It started on the green.</h2>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>You played <strong>{stats.rounds} rounds</strong>.</div>
                <div style={{ fontSize: '1.2rem', opacity: 0.8 }}>And peaked at a massive <strong>{stats.topScore} pts</strong>.</div>
            </div>
        </div>,

        // Slide 2: Charity Choice
        <div className="story-slide" key="2" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ animation: 'fadeUp 1s ease forwards' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem' }}>But you played for something bigger.</h2>
                <div className="avatar-bubble" style={{ width: '120px', height: '120px', fontSize: '3rem', margin: '0 0 1rem', background: 'var(--gold)', color: '#000' }}>
                    {user.selectedCharity?.logo_emoji || '🤝'}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{charityName}</div>
                <p style={{ marginTop: '1rem', color: 'var(--gold)', fontSize: '1.2rem' }}>Donating {user.charity_percentage || 10}% of your prize pool.</p>
            </div>
        </div>,

        // Slide 3: Financial Impact
        <div className="story-slide" key="3" style={{ background: 'rgb(20 20 20)' }}>
            <div style={{ animation: 'fadeUp 1s ease forwards' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💎</div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Together, we raised...</h2>
                <div style={{ fontSize: '5rem', fontWeight: 900, color: '#4cd137', textShadow: '0 0 30px rgba(76, 209, 55, 0.4)' }}>
                    £{amount.toFixed(0)}
                </div>
            </div>
        </div>,

        // Slide 4: Real World
        <div className="story-slide" key="4" style={{ background: 'linear-gradient(135deg, var(--gold), #e67e22)', color: '#000' }}>
            <div style={{ animation: 'fadeUp 1s ease forwards' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Which strictly translates to:</h2>
                <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '3rem' }}>
                    {realWorld}.
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); navigate('/dashboard'); }}
                    className="btn btn-primary"
                    style={{ background: '#000', color: '#fff', border: 'none', padding: '1rem 2rem', fontSize: '1.1rem' }}
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    ];

    return (
        <div
            onClick={nextSlide}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
                color: '#fff', display: 'flex', flexDirection: 'column', cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif'
            }}
        >
            {/* Progress Bars */}
            <div style={{ position: 'absolute', top: '15px', left: '15px', right: '15px', display: 'flex', gap: '5px', zIndex: 100 }}>
                {slides.map((_, i) => (
                    <div key={i} style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', background: '#fff',
                            width: i < currentSlide ? '100%' : i === currentSlide ? '100%' : '0%',
                            transition: i === currentSlide ? 'width 5s linear' : 'none',
                            animation: i === currentSlide ? 'fillBar 5s linear forwards' : 'none'
                        }} />
                    </div>
                ))}
            </div>

            {/* Slide Content */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
                {slides.map((slide, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute', inset: 0, padding: '3rem 2rem', display: 'flex', alignItems: 'center',
                            opacity: i === currentSlide ? 1 : 0,
                            pointerEvents: i === currentSlide ? 'auto' : 'none',
                            transition: 'opacity 0.4s ease'
                        }}
                    >
                        {slide}
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes fillBar { from { width: 0%; } to { width: 100%; } }
                .story-slide { width: 100%; height: 100%; border-radius: 20px; box-shadow: 0 0 50px rgba(0,0,0,0.5); padding: 3rem; display: flex; align-items: center; }
            `}</style>
        </div>
    );
}
