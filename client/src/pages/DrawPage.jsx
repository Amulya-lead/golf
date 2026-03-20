import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DrawPage() {
    const { user } = useAuth();
    const [draw, setDraw] = useState(null);
    const [userScores, setUserScores] = useState([]);
    const [history, setHistory] = useState([]);
    const [userWinnerRecord, setUserWinnerRecord] = useState(null);
    const [claiming, setClaiming] = useState(false);
    const [proofUrl, setProofUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [showTicket, setShowTicket] = useState(false);
    const [ticketIndex, setTicketIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                // 1. Latest Published Draw
                const { data: latest } = await supabase.from('draws')
                    .select('*')
                    .eq('is_published', true)
                    .order('run_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                // 2. User's Scores
                if (user) {
                    const { data: scores } = await supabase.from('scores')
                        .select('total_stableford')
                        .eq('user_id', user.id)
                        .order('date', { ascending: false })
                        .limit(5);
                    setUserScores(scores?.map(s => s.total_stableford) || []);
                }

                const { data: hist } = await supabase.from('draws')
                    .select('*')
                    .eq('is_published', true)
                    .order('run_at', { ascending: false })
                    .limit(10);

                if (latest) setDraw(latest);
                setHistory(hist || []);

                // Fetch winner record for this user if any
                if (latest && user) {
                    const { data: winData } = await supabase
                        .from('winners')
                        .select('*')
                        .eq('draw_id', latest.id)
                        .eq('user_id', user.id)
                        .single();
                    setUserWinnerRecord(winData || null);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [user?.id]);

    if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

    const winningNumbers = draw?.winning_numbers || [];
    const matches = userScores.filter(s => winningNumbers.includes(s)).length;
    const matchType = matches === 5 ? 'JACKPOT (5/5)' : matches === 4 ? 'Secondary (4/5)' : matches === 3 ? 'Matching (3/5)' : null;

    const getTicketNumber = (idx) => {
        const seed = user?.id?.slice(0, 8) || '00000000';
        return parseInt(seed, 16) + idx + 100000;
    };

    const TicketModal = () => {
        const totalTickets = user?.drawEntries || 0;
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem'
            }} onClick={() => { setShowTicket(false); setIsFlipped(false); }}>
                {totalTickets > 1 && (
                    <div style={{ color: 'var(--gold)', marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 900, letterSpacing: '0.2em', textShadow: '0 0 10px rgba(212,175,55,0.3)' }}>
                        ENTRY {ticketIndex + 1} / {totalTickets}
                    </div>
                )}
                <div className="ticket-container" onClick={e => e.stopPropagation()} style={{
                    width: '100%', maxWidth: '600px', perspective: '2000px'
                }}>
                    <div className={`ticket-flip-card ${isFlipped ? 'flipped' : ''}`}>
                        <div className="ticket-face ticket-front">
                            <div className="ticket-shine"></div>
                            <div className="ticket-inner" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div className="ticket-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div>
                                        <div className="gold-text" style={{ fontWeight: 800, letterSpacing: '0.15em', fontSize: '0.65rem', marginBottom: '0.25rem' }}>OFFICIAL DRAW ENTRY</div>
                                        <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, color: '#fff', fontSize: '1.6rem', lineHeight: '1.1', margin: 0 }}>Monthly Charity Draw</h2>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 0 10px var(--gold))' }}>⛳</div>
                                        <div style={{ fontSize: '0.55rem', color: 'var(--gold)', fontWeight: 800, marginTop: '0.2rem' }}>EST. 2024</div>
                                    </div>
                                </div>
                                <div className="ticket-divider" style={{ position: 'relative', height: '2px', borderBottom: '1px dashed rgba(212,175,55,0.4)', margin: '0 -2.5rem 2rem' }}>
                                    <div className="notch left" style={{ position: 'absolute', width: '36px', height: '36px', background: '#050505', border: '2px solid var(--gold)', borderRadius: '50%', top: '-18px', left: '-18px', borderLeft: 'none' }}></div>
                                    <div className="notch right" style={{ position: 'absolute', width: '36px', height: '36px', background: '#050505', border: '2px solid var(--gold)', borderRadius: '50%', top: '-18px', right: '-18px', borderRight: 'none' }}></div>
                                </div>
                                <div className="ticket-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                    <div className="detail-item">
                                        <div className="ticket-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Participant</div>
                                        <div className="ticket-value" style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>{user?.name || 'Valued Member'}</div>
                                    </div>
                                    <div className="detail-item">
                                        <div className="ticket-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Draw Date</div>
                                        <div className="ticket-value" style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>{months[new Date().getMonth()]} {new Date().getFullYear()}</div>
                                    </div>
                                    <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                        <div className="ticket-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Your Scoring Numbers</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            {userScores.map((s, i) => (
                                                <div key={i} style={{ width: '40px', height: '40px', borderRadius: '50%', background: winningNumbers.includes(s) ? 'var(--gold)' : 'rgba(255,255,255,0.1)', color: winningNumbers.includes(s) ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem' }}>{s}</div>
                                            ))}
                                            {userScores.length === 0 && <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>No scores submitted.</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="ticket-footer" style={{ borderTop: '1px solid rgba(255,193,7,0.1)', paddingTop: '1.5rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        <div className="qr-sim" style={{ background: '#fff', padding: '3px', borderRadius: '4px', width: '45px', height: '45px', filter: 'contrast(1.5) invert(1)' }}>
                                            <div style={{ border: '1px solid #000', width: '100%', height: '100%', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px' }}>
                                                {[...Array(9)].map((_, i) => <div key={i} style={{ background: i % 2 === 0 ? '#000' : 'transparent' }}></div>)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>BLOCKCHAIN VERIFIED</div>
                                            <div className="gold-text" style={{ fontSize: '0.7rem', fontWeight: 800 }}>GOLFGIVES SECURE</div>
                                        </div>
                                    </div>
                                    <button className="btn-rotate" onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }} style={{
                                        background: 'rgba(212,175,55,0.1)', border: '1px solid var(--gold)', color: 'var(--gold)',
                                        padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem',
                                        fontWeight: 800, transition: '0.3s all'
                                    }}>↺ VIEW BACK</button>
                                </div>
                            </div>
                        </div>
                        <div className="ticket-face ticket-back" onClick={() => setIsFlipped(false)}>
                            <div className="ticket-inner" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', height: '100%', pointerEvents: 'auto' }}>
                                <div style={{ borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 className="gold-text" style={{ fontSize: '1rem', fontWeight: 900, margin: 0, letterSpacing: '1px' }}>CERTIFIED RECORD</h3>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>PAGE 02/02</div>
                                </div>
                                <div style={{ flex: 1, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                                    <p style={{ marginBottom: '0.8rem' }}><strong style={{ color: 'var(--gold)' }}>✓</strong> This digital certificate is tied to a secure contribution platform.</p>
                                    <p style={{ marginBottom: '0.8rem' }}><strong style={{ color: 'var(--gold)' }}>✓</strong> 10% of entry fees are distributed to local athletic programs.</p>
                                    <p style={{ marginBottom: '0.8rem' }}><strong style={{ color: 'var(--gold)' }}>✓</strong> Draw process is audited and transparent.</p>
                                    <p><strong style={{ color: 'var(--gold)' }}>✓</strong> Ownership is non-transferable and tied to your member ID.</p>
                                </div>
                                <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginTop: 'auto' }}>
                                    <div style={{ fontSize: '1.2rem', color: 'var(--gold)', fontWeight: 900, fontFamily: 'Outfit' }}>GOLFGIVES OFFICIAL</div>
                                    <div style={{ fontSize: '0.5rem', opacity: 0.3, marginTop: '0.2rem' }}>PLATFORM ID: GG-2024-X99</div>
                                    <button className="btn-rotate" style={{ marginTop: '1rem' }}>↺ RETURN</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {totalTickets > 1 && (
                        <>
                            <button className="nav-arrow left" onClick={(e) => { e.stopPropagation(); setTicketIndex(prev => (prev - 1 + totalTickets) % totalTickets); setIsFlipped(false); }}>‹</button>
                            <button className="nav-arrow right" onClick={(e) => { e.stopPropagation(); setTicketIndex(prev => (prev + 1) % totalTickets); setIsFlipped(false); }}>›</button>
                        </>
                    )}
                </div>
                <div style={{ marginTop: '3rem', display: 'flex', gap: '2rem' }}>
                    <button className="btn btn-ghost" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem 2rem' }} onClick={() => setShowTicket(false)}>Close Gallery</button>
                </div>
                <style>{`
                    .ticket-container { position: relative; }
                    .ticket-flip-card {
                        width: 100%; height: 440px;
                        transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                        transform-style: preserve-3d;
                        position: relative;
                    }
                    .ticket-flip-card.flipped { transform: rotateY(180deg); }
                    .ticket-face {
                        position: absolute; width: 100%; height: 100%;
                        -webkit-backface-visibility: hidden; backface-visibility: hidden;
                        border-radius: 24px; border: 1px solid rgba(212,175,55,0.4);
                        background: linear-gradient(135deg, #0f131a 0%, #050505 100%);
                        overflow: hidden;
                        box-shadow: 0 40px 100px rgba(0,0,0,0.9), inset 0 0 40px rgba(212,175,55,0.05);
                    }
                    .ticket-front { z-index: 2; transform: rotateY(0deg); }
                    .ticket-back { transform: rotateY(180deg); background: #0c0c0c; }
                    .ticket-shine {
                        position: absolute; inset: 0;
                        background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 55%, transparent 100%);
                        background-size: 200% 200%;
                        animation: shine 8s infinite linear;
                        z-index: 5; pointer-events: none;
                    }
                    @keyframes shine { 0% { background-position: -200% -200%; } 100% { background-position: 200% 200%; } }
                    .nav-arrow {
                        position: absolute; top: 50%; width: 54px; height: 54px;
                        background: #fff; color: #000; border: none; border-radius: 50%;
                        font-size: 2rem; cursor: pointer; z-index: 100;
                        transform: translateY(-50%); transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        box-shadow: 0 15px 30px rgba(0,0,0,0.4);
                        display: flex; align-items: center; justify-content: center; padding-bottom: 4px;
                    }
                    .nav-arrow:hover { transform: translateY(-50%) scale(1.1); background: var(--gold); }
                    .nav-arrow.left { left: -75px; }
                    .nav-arrow.right { right: -75px; }
                    .btn-rotate:hover { background: var(--gold) !important; color: #000 !important; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(212,175,55,0.3); }
                    @media (max-width: 850px) {
                        .nav-arrow.left { left: -25px; transform: translateY(-50%) scale(0.8); }
                        .nav-arrow.right { right: -25px; transform: translateY(-50%) scale(0.8); }
                        .ticket-flip-card { height: 480px; }
                    }
                `}</style>
            </div>
        );
    };

    return (
        <div className="page">
            <div className="container" style={{ paddingBottom: '4rem' }}>
                <div className="page-header">
                    <h1 className="page-title">🎰 Monthly Draw Results</h1>
                    <p className="page-subtitle">Your active entries: <strong className="gold-text">{user?.drawEntries ?? 0}</strong></p>
                </div>

                {!draw ? (
                    <div className="card card-gold" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⌛</div>
                        <h2 style={{ fontWeight: 800 }}>Awaiting Results</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '1rem auto' }}>The next draw is coming soon. Maintain your last 5 golf rounds to stay eligible!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="card card-gold" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                            <div className="badge badge-gold" style={{ marginBottom: '1rem' }}>{months[draw.month - 1]} {draw.year} OFFICIAL DRAW</div>

                            <div style={{ marginBottom: '2.5rem' }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>WINNING NUMBERS</div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="draw-ball" style={{
                                            width: '64px', height: '64px', borderRadius: '50%', background: 'var(--gold)', color: '#000',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 900,
                                            boxShadow: '0 0 25px rgba(212, 175, 55, 0.4)'
                                        }}>
                                            {draw.winning_numbers?.[i] || '?'}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Prize Pool Breakdown (07 Requirements) */}
                            {draw.rollover_amount > 0 && (
                                <div className="fade-up" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '12px', padding: '1rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '600px', margin: '1rem auto 0' }}>
                                    <span style={{ fontSize: '1.5rem' }}>🔄</span>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 800, color: '#3b82f6', fontSize: '0.9rem' }}>JACKPOT ROLLOVER</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>No one matched 5 numbers last month! £{draw.rollover_amount.toFixed(2)} has been added to this month's pool.</div>
                                    </div>
                                </div>
                            )}

                            {/* 09 Requirement: Winner Claim Section */}
                            {userWinnerRecord && userWinnerRecord.status === 'pending' && !userWinnerRecord.proof_url && (
                                <div className="card fade-up" style={{ background: 'rgba(212, 175, 55, 0.05)', border: '1px solid var(--gold)', marginTop: '2rem', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                        <div style={{ fontSize: '2.5rem' }}>🎁</div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Match Found! Claim Your Prize</h3>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                                To verify your win, please upload a screenshot of your scores from your golf club's official app or handicap portal.
                                            </p>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Paste screenshot URL (e.g. Imgur or Google Drive link)"
                                                    value={proofUrl}
                                                    onChange={(e) => setProofUrl(e.target.value)}
                                                    className="form-input"
                                                    style={{ flex: 1, marginBottom: 0 }}
                                                />
                                                <button
                                                    className="btn btn-primary"
                                                    disabled={claiming || !proofUrl}
                                                    onClick={async () => {
                                                        setClaiming(true);
                                                        const { error } = await supabase.from('winners').update({ proof_url: proofUrl }).eq('id', userWinnerRecord.id);
                                                        if (!error) window.location.reload();
                                                        else alert(error.message);
                                                        setClaiming(false);
                                                    }}
                                                >
                                                    {claiming ? 'Submitting...' : 'Submit Proof'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {userWinnerRecord && userWinnerRecord.proof_url && (
                                <div className="card fade-up" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', marginTop: '2rem', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                        <div style={{ fontSize: '2rem' }}>{userWinnerRecord.status === 'paid' ? '✅' : '⏳'}</div>
                                        <div>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Claim Status: {userWinnerRecord.status.toUpperCase()}</h3>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {userWinnerRecord.status === 'pending' && 'Your proof is under review by our administrators.'}
                                                {userWinnerRecord.status === 'verified' && 'Verification successful! Payout is being processed.'}
                                                {userWinnerRecord.status === 'paid' && 'Success! Your prize has been paid out.'}
                                                {userWinnerRecord.status === 'rejected' && 'Claim rejected. Please contact support.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid-3" style={{ maxWidth: '800px', margin: '2.5rem auto' }}>
                                <div className="card" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '2px solid var(--gold)' }}>
                                    <div className="stat-label">Jackpot (5 Match)</div>
                                    <div className="stat-value gold">£{(draw.prize_pool * 0.4).toFixed(2)}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>40% Pool Share</div>
                                </div>
                                <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <div className="stat-label">Secondary (4 Match)</div>
                                    <div className="stat-value">£{(draw.prize_pool * 0.35).toFixed(2)}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>35% Pool Share</div>
                                </div>
                                <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <div className="stat-label">Matching (3 Match)</div>
                                    <div className="stat-value">£{(draw.prize_pool * 0.25).toFixed(2)}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>25% Pool Share</div>
                                </div>
                            </div>

                            <div className="grid-2" style={{ maxWidth: '800px', margin: '0 auto 2.5rem', gap: '1rem' }}>
                                <div className="card" style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem' }}>
                                    <div className="stat-label">Charity Donation</div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--green-light)' }}>£{draw.charity_pool?.toFixed(2)}</div>
                                </div>
                                <div className="card" style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem' }}>
                                    <div className="stat-label">Total Participants</div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{draw.total_subscribers}</div>
                                </div>
                            </div>

                            {draw.rollover_amount > 0 && (
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', fontWeight: 700 }}>
                                    🔄 NO JACKPOT WINNER: £{draw.rollover_amount.toFixed(2)} rolls over to next month!
                                </div>
                            )}

                            <div className="card" style={{ background: matchType ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)', border: matchType ? '1px solid var(--gold)' : '1px dotted var(--border-subtle)', padding: '2rem' }}>
                                <h3 style={{ marginBottom: '1rem' }}>Your Match Status</h3>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                                    {matchType ? (
                                        <span className="gold-text">🎉 CONGRATULATIONS! You achieved a {matchType} match!</span>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)' }}>You matched {matches} numbers this round.</span>
                                    )}
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.8rem' }}>Check your Digital Ticket Gallery below to see your entered scoring numbers for this month.</p>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <button onClick={() => { setShowTicket(true); setTicketIndex(0); setIsFlipped(false); }} className="btn btn-primary" style={{ padding: '1.5rem 3rem' }}>
                                🎟️ View My Digital Entry Gallery
                            </button>
                        </div>
                    </div>
                )}

                {showTicket && <TicketModal />}

                {history.length > 0 && (
                    <div style={{ marginTop: '4rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Past Draw Results</h3>
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>Month</th><th>Winning Numbers</th><th>Prize Pool</th><th>Charity Pot</th><th>Players</th></tr></thead>
                                <tbody>
                                    {history.map((d, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{months[d.month - 1]} {d.year}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    {d.winning_numbers?.map((n, idx) => (
                                                        <span key={idx} style={{ background: 'rgba(212, 175, 55, 0.15)', color: 'var(--gold)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>{n}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td>£{d.prize_pool?.toFixed(2)}</td>
                                            <td style={{ color: 'var(--green-light)' }}>£{d.charity_pool?.toFixed(2)}</td>
                                            <td>{d.total_subscribers}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
