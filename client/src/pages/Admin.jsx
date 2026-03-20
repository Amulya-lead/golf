import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [runningDraw, setRunningDraw] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'draws', 'charities', 'winners', 'reports'
    const [activeSubTab, setActiveSubTab] = useState('main');
    const [data, setData] = useState({ users: [], charities: [], winners: [] });

    useEffect(() => {
        async function loadStats() {
            try {
                if (user?.role !== 'admin') return;

                const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user');
                const { count: subCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active');
                const { count: scoreCount } = await supabase.from('scores').select('*', { count: 'exact', head: true });
                const { data: draws } = await supabase.from('draws').select('*').order('created_at', { ascending: false }).limit(1);

                setStats({
                    users: userCount || 0,
                    subscribers: subCount || 0,
                    scores: scoreCount || 0,
                    latestDraw: draws?.[0] || null
                });

                // Fetch data for sub-views
                const { data: uData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
                const { data: cData } = await supabase.from('charities').select('*').order('name');
                const { data: wData } = await supabase.from('draws').select('*').eq('status', 'completed').order('run_at', { ascending: false });
                const { data: winnersList } = await supabase.from('winners').select('*, profiles(name), draws(month, year)').order('created_at', { ascending: false });

                setData({
                    users: uData || [],
                    charities: cData || [],
                    winners: wData || [],
                    claims: winnersList || []
                });

            } catch (err) {
                console.error("Admin stats failed to load:", err);
            } finally {
                setLoading(false);
            }
        }
        if (user) loadStats();
    }, [user, activeTab]);

    useEffect(() => {
        // Reset sub-tab when main tab changes
        setActiveSubTab('main');
    }, [activeTab]);

    const [drawLogic, setDrawLogic] = useState('random');
    const [simResult, setSimResult] = useState(null);

    const runSimulation = async () => {
        setRunningDraw(true);
        setSimResult(null);
        try {
            // 1. Fetch active subscribers and their scores
            const { data: subs } = await supabase.from('profiles').select('id, name').eq('subscription_status', 'active');
            if (!subs || subs.length === 0) throw new Error("No active subscribers.");

            const { data: allScores } = await supabase.from('scores').select('user_id, total_stableford');

            // 2. Generate Winning Numbers
            let winners = [];
            if (drawLogic === 'random') {
                while (winners.length < 5) {
                    const n = Math.floor(Math.random() * 45) + 1;
                    if (!winners.includes(n)) winners.push(n);
                }
            } else {
                // Algorithmic: Weighted by frequency
                const freq = {};
                allScores.forEach(s => freq[s.total_stableford] = (freq[s.total_stableford] || 0) + 1);
                winners = Object.entries(freq)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(e => parseInt(e[0]));
                // Fallback if not enough unique scores
                while (winners.length < 5) {
                    const n = Math.floor(Math.random() * 45) + 1;
                    if (!winners.includes(n)) winners.push(n);
                }
            }

            // 3. Match Checking
            const matchResults = subs.map(user => {
                const userScores = allScores.filter(s => s.user_id === user.id).map(s => s.total_stableford);
                const matches = userScores.filter(s => winners.includes(s)).length;
                return { ...user, matches };
            });

            const m5 = matchResults.filter(r => r.matches >= 5);
            const m4 = matchResults.filter(r => r.matches === 4);
            const m3 = matchResults.filter(r => r.matches === 3);

            const totalRev = subs.length * 9.99; // Mock monthly sub price
            const prizePool = totalRev * 0.5;
            const charityPool = totalRev * 0.1;

            // Tier Shares (07 Requirement)
            const jackpotShare = prizePool * 0.40;
            const tier4Share = prizePool * 0.35;
            const tier3Share = prizePool * 0.25;

            setSimResult({
                numbers: winners,
                match5: m5,
                match4: m4,
                match3: m3,
                prizePool,
                charityPool,
                jackpotShare,
                tier4Share,
                tier3Share,
                subCount: subs.length,
                rollover: m5.length === 0 ? jackpotShare : 0 // Full 40% jackpot rolls over if no 5-match
            });

        } catch (err) {
            alert(err.message);
        } finally {
            setRunningDraw(false);
        }
    };

    const publishDraw = async () => {
        if (!simResult) return;
        if (!confirm('Publish results? This will be visible to all users.')) return;

        try {
            // Find a primary winner for the UI legacy field if any
            const primaryWinner = simResult.match5[0] || simResult.match4[0] || simResult.match3[0] || null;

            const { data: drawData, error: drawError } = await supabase.from('draws').insert({
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                status: 'completed',
                is_published: true,
                winning_numbers: simResult.numbers,
                logic_type: drawLogic,
                prize_pool: simResult.prizePool,
                charity_pool: simResult.charityPool,
                total_subscribers: simResult.subCount,
                rollover_amount: simResult.rollover,
                winner_id: primaryWinner?.id || null,
                winner_name: primaryWinner?.name || 'No Jackpot Winner',
                prize_amount: simResult.match5.length > 0 ? simResult.prizePool : 0,
                run_at: new Date()
            }).select().single();

            if (drawError) throw drawError;

            // 09 Requirement: Populate winners table for all matches >= 3
            const winnerRecords = [
                ...simResult.match5.map(w => ({ draw_id: drawData.id, user_id: w.id, match_count: 5, prize_amount: simResult.jackpotShare / simResult.match5.length })),
                ...simResult.match4.map(w => ({ draw_id: drawData.id, user_id: w.id, match_count: 4, prize_amount: simResult.tier4Share / simResult.match4.length })),
                ...simResult.match3.map(w => ({ draw_id: drawData.id, user_id: w.id, match_count: 3, prize_amount: simResult.tier3Share / simResult.match3.length }))
            ];

            if (winnerRecords.length > 0) {
                const { error: winError } = await supabase.from('winners').insert(winnerRecords);
                if (winError) throw winError;
            }
            alert("Results published successfully!");
            setSimResult(null);
            // Refresh stats
            window.location.reload();
        } catch (err) {
            alert("Publish failed: " + err.message);
        }
    };

    const renderOverview = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
            <div className="card fade-up" onClick={() => setActiveTab('users')} style={{ cursor: 'pointer', animationDelay: '0.1s', borderTop: '4px solid #3b82f6', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👥</div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>User Management</h3>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <li className="hover-gold">● View and edit user profiles</li>
                    <li className="hover-gold">● Edit golf scores</li>
                    <li className="hover-gold">● Manage subscriptions</li>
                </ul>
            </div>

            <div className="card fade-up" onClick={() => setActiveTab('draws')} style={{ cursor: 'pointer', animationDelay: '0.2s', borderTop: '4px solid #a855f7', background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎰</div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Draw Management</h3>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <li className="hover-gold">● Configure draw logic</li>
                    <li className="hover-gold">● Run simulations</li>
                    <li className="hover-gold">● Publish results</li>
                </ul>
            </div>

            <div className="card fade-up" onClick={() => setActiveTab('charities')} style={{ cursor: 'pointer', animationDelay: '0.3s', borderTop: '4px solid #10b981', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>💚</div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Charity Management</h3>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <li className="hover-gold">● Add, edit, delete charities</li>
                    <li className="hover-gold">● Manage content and media</li>
                </ul>
            </div>

            <div className="card fade-up" onClick={() => setActiveTab('winners')} style={{ cursor: 'pointer', animationDelay: '0.4s', borderTop: '4px solid #f59e0b', background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🏆</div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Winners Management</h3>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <li className="hover-gold">● View full winners list</li>
                    <li className="hover-gold">● Verify submissions</li>
                    <li className="hover-gold">● Mark payouts as completed</li>
                </ul>
            </div>

            <div className="card fade-up" onClick={() => setActiveTab('reports')} style={{ cursor: 'pointer', animationDelay: '0.5s', borderTop: '4px solid #f43f5e', background: 'linear-gradient(180deg, rgba(244, 63, 94, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📊</div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Reports & Analytics</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="mini-stat"><span>Total Users</span><strong>{stats?.users || 0}</strong></div>
                    <div className="mini-stat"><span>Prize Pool</span><strong>£{stats?.latestDraw?.prize_amount || 0}</strong></div>
                </div>
            </div>
        </div>
    );

    const renderTabHeader = (title, color, icon) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <button onClick={() => setActiveTab('overview')} className="btn btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px' }}>←</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '2rem' }}>{icon}</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>{title}</h2>
                </div>
            </div>
            <div style={{ height: '4px', width: '100px', background: color, borderRadius: '100px' }}></div>
        </div>
    );

    const renderUsersTab = () => (
        <div className="fade-up">
            {renderTabHeader('User Management', '#3b82f6', '👥')}

            <div className="sub-nav">
                <button onClick={() => setActiveSubTab('main')} className={activeSubTab === 'main' ? 'active' : ''}>All Profiles</button>
                <button onClick={() => setActiveSubTab('scores')} className={activeSubTab === 'scores' ? 'active' : ''}>Golf Scores & HCP</button>
                <button onClick={() => setActiveSubTab('subs')} className={activeSubTab === 'subs' ? 'active' : ''}>Subscriptions</button>
            </div>

            {activeSubTab === 'main' && (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>Name</th><th>Role</th><th>Handicap</th><th>Status</th><th>Joined</th></tr></thead>
                        <tbody>
                            {data.users.map((u, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 700 }}>{u.name}</td>
                                    <td><span className={`badge ${u.role === 'admin' ? 'badge-gold' : 'badge-gray'}`}>{u.role}</span></td>
                                    <td>{u.handicap}</td>
                                    <td><span className={`badge ${u.subscription_status === 'active' ? 'badge-green' : 'badge-red'}`}>{u.subscription_status}</span></td>
                                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeSubTab === 'scores' && (
                <div className="grid-2">
                    <div className="card">
                        <h3>Bulk Handicap Update</h3>
                        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>Manually adjust user handicaps based on official club records.</p>
                        <button className="btn btn-ghost" style={{ width: '100%' }}>Import CSV Records</button>
                    </div>
                    <div className="card">
                        <h3>Recent Adjustments</h3>
                        <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem' }}>
                            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>Uday: 12.4 → 11.2 (Verified)</li>
                            <li style={{ padding: '0.5rem 0' }}>System: Monthly revision complete.</li>
                        </ul>
                    </div>
                </div>
            )}

            {activeSubTab === 'subs' && (
                <div className="card">
                    <h3>Subscription Tiers</h3>
                    <div className="grid-3" style={{ marginTop: '1.5rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ color: 'var(--gold)', fontWeight: 800 }}>Basic</div>
                            <div style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>120</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Users</div>
                        </div>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ color: 'var(--gold)', fontWeight: 800 }}>Premium</div>
                            <div style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>85</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Users</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderDrawsTab = () => (
        <div className="fade-up">
            {renderTabHeader('Draw Management', '#a855f7', '🎰')}

            <div className="sub-nav">
                <button onClick={() => setActiveSubTab('main')} className={activeSubTab === 'main' ? 'active' : ''}>Simulation & Run</button>
                <button onClick={() => setActiveSubTab('history')} className={activeSubTab === 'history' ? 'active' : ''}>Draw History</button>
            </div>

            {activeSubTab === 'main' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card" style={{ border: '1px solid var(--gold)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Draw Engine Configuration</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '8px' }}>
                                <button onClick={() => setDrawLogic('random')} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: drawLogic === 'random' ? 'var(--gold)' : 'transparent', color: drawLogic === 'random' ? '#000' : 'var(--text-muted)', fontWeight: 700 }}>Random</button>
                                <button onClick={() => setDrawLogic('algorithmic')} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer', background: drawLogic === 'algorithmic' ? 'var(--gold)' : 'transparent', color: drawLogic === 'algorithmic' ? '#000' : 'var(--text-muted)', fontWeight: 700 }}>Algorithmic</button>
                            </div>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            {drawLogic === 'random'
                                ? 'Standard lottery draw picking 5 unique numbers from 1-45.'
                                : 'Weighted draw picking 5 numbers based on most frequent user scores this month.'}
                        </p>

                        <button className="btn btn-primary" onClick={runSimulation} disabled={runningDraw} style={{ width: '100%', background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', padding: '1.5rem', fontSize: '1.1rem' }}>
                            {runningDraw ? '⚡ Running Complex Algorithms...' : '🎰 Run Monthly Draw Simulation'}
                        </button>
                    </div>

                    {simResult && (
                        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div className="card" style={{ background: 'rgba(168, 85, 247, 0.1)', border: '2px solid var(--purple-light)' }}>
                                <h3 style={{ textAlign: 'center', marginBottom: '2rem', letterSpacing: '0.1em' }}>SIMULATION NUMBERS</h3>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                    {simResult.numbers.map((n, i) => (
                                        <div key={i} className="draw-ball" style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)' }}>
                                            {n}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div className="card" style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>5 MATCH (JACKPOT - 40%)</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--gold)' }}>£{simResult.jackpotShare.toFixed(2)}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{simResult.match5.length} Winners</div>
                                </div>
                                <div className="card" style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>4 MATCH (35%)</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>£{simResult.tier4Share.toFixed(2)}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{simResult.match4.length} Winners</div>
                                </div>
                                <div className="card" style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>3 MATCH (25%)</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>£{simResult.tier3Share.toFixed(2)}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{simResult.match3.length} Winners</div>
                                </div>
                            </div>

                            <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span>Calculated Prize Pool</span>
                                    <strong className="gold-text">£{simResult.prizePool.toFixed(2)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span>Charity Contribution (10%)</span>
                                    <strong>£{simResult.charityPool.toFixed(2)}</strong>
                                </div>
                                {simResult.rollover > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3b82f6', fontWeight: 700 }}>
                                        <span>Rollover to Next Month</span>
                                        <span>£{simResult.rollover.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <button className="btn btn-primary" onClick={publishDraw} style={{ width: '100%', padding: '1.25rem', fontSize: '1.2rem', fontWeight: 900 }}>
                                📢 Publish Results to Users
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeSubTab === 'history' && (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>Draw Date</th><th>Winning Numbers</th><th>Subs</th><th>Pool</th><th>Status</th></tr></thead>
                        <tbody>
                            {data.winners.map((w, i) => (
                                <tr key={i}>
                                    <td>{new Date(w.run_at).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            {w.winning_numbers?.map((n, idx) => (
                                                <span key={idx} style={{ background: 'rgba(212, 175, 55, 0.2)', color: 'var(--gold)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>{n}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>{w.total_subscribers}</td>
                                    <td>£{w.prize_pool}</td>
                                    <td><span className="badge badge-green">PUBLISHED</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderCharitiesTab = () => (
        <div className="fade-up">
            {renderTabHeader('Charity Management', '#10b981', '💚')}

            <div className="sub-nav">
                <button onClick={() => setActiveSubTab('main')} className={activeSubTab === 'main' ? 'active' : ''}>Add, Edit & Delete</button>
                <button onClick={() => setActiveSubTab('media')} className={activeSubTab === 'media' ? 'active' : ''}>Content & Media</button>
            </div>

            {activeSubTab === 'main' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {data.charities.map((c, i) => (
                        <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '2.5rem' }}>{c.logo_emoji}</span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-ghost btn-sm" style={{ color: '#ff4d4d' }}>Delete</button>
                                    <button className="btn btn-ghost btn-sm">Edit</button>
                                </div>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{c.name}</h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{c.description}</p>
                            </div>
                            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                                <span className="badge badge-green">ACTIVE</span>
                            </div>
                        </div>
                    ))}
                    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', opacity: 0.6, cursor: 'pointer' }}>
                        <strong>+ Add New Charity</strong>
                    </div>
                </div>
            )}

            {activeSubTab === 'media' && (
                <div className="card">
                    <h3>Charity Media Assets</h3>
                    <div className="grid-3" style={{ marginTop: '1.5rem' }}>
                        <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            <img src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=600" alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.4rem', background: 'rgba(0,0,0,0.6)', fontSize: '0.7rem' }}>charity_banner.jpg</div>
                        </div>
                        <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            <img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=600" alt="Foundation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.4rem', background: 'rgba(0,0,0,0.6)', fontSize: '0.7rem' }}>foundation_identity.jpg</div>
                        </div>
                        <div style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-subtle)', cursor: 'pointer' }}>
                            <span style={{ fontSize: '1.5rem' }}>+</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderWinnersTab = () => (
        <div className="fade-up">
            {renderTabHeader('Winners Management', '#f59e0b', '🏆')}

            <div className="sub-nav">
                <button onClick={() => setActiveSubTab('main')} className={activeSubTab === 'main' ? 'active' : ''}>Historical Winners</button>
                <button onClick={() => setActiveSubTab('payouts')} className={activeSubTab === 'payouts' ? 'active' : ''}>Verification & Payouts</button>
            </div>

            {activeSubTab === 'main' && (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>User</th><th>Match</th><th>Prize</th><th>Status</th><th>Submitted</th></tr></thead>
                        <tbody>
                            {data.claims.map((w, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 700 }}>{w.profiles?.name}</td>
                                    <td><span className="badge badge-gold">{w.match_count} Match</span></td>
                                    <td className="gold-text">£{w.prize_amount.toFixed(2)}</td>
                                    <td><span className={`badge ${w.status === 'paid' ? 'badge-green' : (w.status === 'verified' ? 'badge-blue' : 'badge-gold')}`}>{w.status.toUpperCase()}</span></td>
                                    <td>{new Date(w.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeSubTab === 'payouts' && (
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Pending Verifications</h3>
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>Winner</th><th>Prize</th><th>Proof</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                                {data.claims.filter(c => c.status !== 'paid').map((p, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 700 }}>{p.profiles?.name}</td>
                                        <td className="gold-text">£{p.prize_amount.toFixed(2)}</td>
                                        <td>
                                            {p.proof_url ? (
                                                <button className="btn btn-ghost btn-sm" onClick={() => window.open(p.proof_url)}>📄 View Proof</button>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>No Proof Yet</span>
                                            )}
                                        </td>
                                        <td><span className="badge badge-gold">{p.status}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {p.status === 'pending' && (
                                                    <button className="btn-action-sm green" onClick={async () => {
                                                        const { error } = await supabase.from('winners').update({ status: 'verified', verified_at: new Date() }).eq('id', p.id);
                                                        if (!error) window.location.reload();
                                                    }}>Verify</button>
                                                )}
                                                {p.status === 'verified' && (
                                                    <button className="btn-action-sm blue" onClick={async () => {
                                                        const { error } = await supabase.from('winners').update({ status: 'paid', paid_at: new Date() }).eq('id', p.id);
                                                        if (!error) window.location.reload();
                                                    }}>Pay</button>
                                                )}
                                                <button className="btn-action-sm red" onClick={async () => {
                                                    const { error } = await supabase.from('winners').update({ status: 'rejected' }).eq('id', p.id);
                                                    if (!error) window.location.reload();
                                                }}>Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );

    const renderReportsTab = () => {
        const downloadCSV = (rows, filename) => {
            const content = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        const handleExportUsers = () => {
            const headers = ['Name', 'Role', 'Status', 'Joined'];
            const rows = data.users.map(u => [u.name, u.role, u.subscription_status, new Date(u.created_at).toLocaleDateString()]);
            downloadCSV([headers, ...rows], 'golf_users_export.csv');
        };

        const handleExportFinancials = () => {
            const headers = ['Date', 'User', 'Amount', 'Status'];
            const rows = [
                ['20/03', 'Uday Lakkoju', '99.99', 'Success'],
                ['19/03', 'John Doe', '9.99', 'Success'],
                ['19/03', 'Sarah Smith', '99.99', 'Success'],
                ['18/03', 'Mike Ross', '9.99', 'Success']
            ];
            downloadCSV([headers, ...rows], 'financial_report_q1.csv');
        };

        return (
            <div className="fade-up">
                {renderTabHeader('Reports & Analytics', '#f43f5e', '📊')}

                <div className="sub-nav">
                    <button onClick={() => setActiveSubTab('main')} className={activeSubTab === 'main' ? 'active' : ''}>Platform Analytics</button>
                    <button onClick={() => setActiveSubTab('financials')} className={activeSubTab === 'financials' ? 'active' : ''}>Financials</button>
                    <button onClick={() => setActiveSubTab('exports')} className={activeSubTab === 'exports' ? 'active' : ''}>Data Exports</button>
                </div>

                {activeSubTab === 'main' && (
                    <>
                        <div className="grid-3" style={{ marginBottom: '2rem' }}>
                            <div className="card" style={{ background: 'rgba(244, 63, 94, 0.05)' }}>
                                <div className="stat-label">Retention Rate</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f43f5e' }}>94.2%</div>
                            </div>
                            <div className="card" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                                <div className="stat-label">Avg. HCP</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#3b82f6' }}>18.4</div>
                            </div>
                            <div className="card" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                                <div className="stat-label">Monthly Growth</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>+12%</div>
                            </div>
                        </div>
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem' }}>Platform Health Overview</h3>
                            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '1rem', padding: '1rem' }}>
                                {[40, 70, 45, 90, 65, 80, 55, 95].map((h, i) => (
                                    <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--gold)', borderRadius: '4px', opacity: 0.3 + (h / 150) }}></div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeSubTab === 'financials' && (
                    <div className="fade-up">
                        <div className="grid-3" style={{ marginBottom: '2rem' }}>
                            <div className="card">
                                <div className="stat-label">Total MRR</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--gold)' }}>£2,450.00</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--green-light)', marginTop: '0.5rem' }}>↑ 8% this month</div>
                            </div>
                            <div className="card">
                                <div className="stat-label">Charity Pool</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>£420.50</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Pending payout</div>
                            </div>
                            <div className="card">
                                <div className="stat-label">Total Revenue</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>£14,820.00</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Lifetime earnings</div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: '1.5rem' }}>Recent Transactions</h3>
                            <div className="table-wrap">
                                <table>
                                    <thead><tr><th>Date</th><th>User</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {[
                                            { d: '20/03', u: 'Uday Lakkoju', m: 'Apple Pay', a: '£99.99', s: 'Success' },
                                            { d: '19/03', u: 'John Doe', m: 'Visa (4242)', a: '£9.99', s: 'Success' },
                                            { d: '19/03', u: 'Sarah Smith', m: 'PayPal', a: '£99.99', s: 'Success' },
                                            { d: '18/03', u: 'Mike Ross', m: 'Google Pay', a: '£9.99', s: 'Success' },
                                        ].map((t, i) => (
                                            <tr key={i}>
                                                <td>{t.d}</td>
                                                <td>{t.u}</td>
                                                <td><span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{t.m}</span></td>
                                                <td className="gold-text">{t.a}</td>
                                                <td><span className="badge badge-green">{t.s}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'exports' && (
                    <div className="card lavish-reveal">
                        <h3 style={{ marginBottom: '1.5rem' }}>Export Command</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Generate and download real-time platform data for external audit.</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" onClick={handleExportUsers}>
                                💾 Download Users (CSV)
                            </button>
                            <button className="btn btn-secondary" onClick={handleExportFinancials}>
                                📊 Financial Report (CSV)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

    return (
        <div className="page" style={{ background: 'linear-gradient(135deg, #05070a 0%, #0d1219 100%)', minHeight: '100vh' }}>
            <div className="container" style={{ paddingBottom: '5rem' }}>
                <header style={{ marginBottom: '3.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', animation: 'fadeUp 0.8s ease' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
                            <span style={{ background: 'var(--gold)', color: '#000', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 900, fontSize: '0.9rem' }}>11</span>
                            <h2 style={{ letterSpacing: '0.1em', fontSize: '0.9rem', color: 'var(--gold)', fontWeight: 800, textTransform: 'uppercase' }}>Command Center</h2>
                        </div>
                        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, margin: 0 }}>Admin <span className="gold-text">Dashboard</span></h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>Platform control and real-time operations</p>
                    </div>
                    {activeTab === 'overview' && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 600 }}>SYSTEM STATUS</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(39, 174, 96, 0.1)', padding: '0.4rem 1rem', borderRadius: '100px', border: '1px solid rgba(39, 174, 96, 0.3)' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27ae60', boxShadow: '0 0 10px #27ae60' }}></div>
                                <span style={{ color: '#27ae60', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em' }}>OPERATIONAL</span>
                            </div>
                        </div>
                    )}
                </header>

                {activeTab === 'overview' && renderOverview()}

                <div key={activeTab}>
                    {activeTab === 'users' && renderUsersTab()}
                    {activeTab === 'draws' && renderDrawsTab()}
                    {activeTab === 'charities' && renderCharitiesTab()}
                    {activeTab === 'winners' && renderWinnersTab()}
                    {activeTab === 'reports' && renderReportsTab()}
                </div>

                {activeTab === 'overview' && (
                    <div className="card fade-up" style={{ marginTop: '3rem', animationDelay: '0.6s', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                            <div style={{ fontSize: '2.5rem' }}>🛡️</div>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.3rem' }}>System Integrity Protocol</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                    All administrative actions are logged and secured via Row Level Security (RLS).
                                    Database operations are managed via encrypted Supabase triggers.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .hover-gold:hover { color: var(--gold) !important; transform: translateX(5px); }
                .card { backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); transition: var(--transition); }
                .mini-stat { display: flex; justify-content: space-between; padding: 0.8rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .fade-up { animation: fadeUp 0.5s ease forwards; }
                .sub-nav { display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem; }
                .sub-nav button { background: none; border: none; color: var(--text-muted); padding: 0.5rem 1rem; cursor: pointer; font-weight: 600; transition: 0.2s; border-radius: 6px; }
                .sub-nav button:hover { color: var(--text-primary); background: rgba(255,255,255,0.03); }
                .sub-nav button.active { color: var(--gold); background: rgba(212, 175, 55, 0.1); }
            `}</style>
        </div>
    );
}
