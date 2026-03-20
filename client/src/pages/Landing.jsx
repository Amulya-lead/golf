import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const impactStats = [
    { value: '£72,400', label: 'Raised for global causes' },
    { value: '18', label: 'Verified charity partners' },
    { value: '1,240', label: 'Lives directly impacted' },
    { value: '£410', label: 'Avg. donation per draw' },
];

const impactFeatures = [
    { icon: '🌍', title: 'Global Giving', desc: '10% of every subscription goes directly to your chosen cause. Watch your collective impact transform communities.' },
    { icon: '✨', title: 'Life-Changing Wins', desc: 'Enter monthly draws with prize pools funded by our collective. Win big while doing good.' },
    { icon: '🤝', title: 'Purposeful Play', desc: 'Every golf score you enter earns you draw tickets. The more you play, the more you contribute.' },
    { icon: '📈', title: 'Transparency First', desc: 'Track every penny you’ve donated. Full visibility into how your subscription makes a difference.' },
];

export default function Landing() {
    const { user } = useAuth();
    return (
        <div className="page" style={{ paddingTop: 0 }}>
            {/* Hero (Emotion-Driven) */}
            <section style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                padding: '8rem 2rem 6rem', position: 'relative', overflow: 'hidden',
                background: 'radial-gradient(circle at 50% 50%, rgba(201,168,76,0.05) 0%, transparent 50%)'
            }}>
                <div style={{ position: 'relative', maxWidth: '820px', zIndex: 10 }}>
                    <div className="badge badge-gold pulse" style={{ marginBottom: '2rem', fontSize: '0.85rem', padding: '0.4rem 1.2rem' }}>
                        ✨ The Impact-First Golf Collective
                    </div>
                    <h1 style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', fontWeight: 900, lineHeight: 1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                        Give Greater.<br />
                        <span className="gold-text">Win Bigger.</span><br />
                        Play Better.
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: 1.6, fontWeight: 400 }}>
                        Join the UK's first subscription collective where your love for the game
                        directly funds world-changing causes, all while giving you a shot at monthly life-changing prizes.
                    </p>
                    <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {user ? (
                            <Link to="/dashboard" className="btn btn-primary btn-lg btn-shimmer">Go to Dashboard →</Link>
                        ) : (
                            <>
                                <Link to="/register" className="btn btn-primary btn-lg btn-shimmer">Join the Collective</Link>
                                <Link to="/pricing" className="btn btn-secondary btn-lg">See the Impact</Link>
                            </>
                        )}
                    </div>
                    <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>100% Secure · Cancel anytime · Choose your cause</p>
                </div>

                {/* Abstract Motion Decoration (No Clichés) */}
                <div style={{
                    position: 'absolute', right: '10%', top: '20%',
                    width: '300px', height: '300px',
                    background: 'radial-gradient(circle, var(--gold-dim) 0%, transparent 70%)',
                    filter: 'blur(60px)', opacity: 0.4, animation: 'float 8s ease-in-out infinite'
                }} />
                <div style={{
                    position: 'absolute', left: '10%', bottom: '20%',
                    width: '200px', height: '200px',
                    background: 'radial-gradient(circle, rgba(39, 174, 96, 0.1) 0%, transparent 70%)',
                    filter: 'blur(50px)', opacity: 0.3, animation: 'float 12s ease-in-out infinite reverse'
                }} />

                <style>{`@keyframes float { 0%,100%{transform:translate(0, 0)} 50%{transform:translate(-20px, 30px)} }`}</style>
            </section>

            {/* Impact Stats */}
            <section style={{ padding: '4rem 2rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
                <div className="container">
                    <div className="grid-4">
                        {impactStats.map((s, i) => (
                            <div key={i} className="fade-up" style={{ textAlign: 'center', animationDelay: `${i * 0.1}s` }}>
                                <div className="stat-value gold" style={{ fontSize: '2.8rem' }}>{s.value}</div>
                                <div className="stat-label" style={{ marginTop: '0.5rem', opacity: 0.7 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission Features */}
            <section style={{ padding: '8rem 2rem' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <div className="gold-text" style={{ fontWeight: 800, letterSpacing: '0.2em', fontSize: '0.8rem', marginBottom: '1rem' }}>HOW IT WORKS</div>
                        <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>Every round played<br />is a <span className="gold-text">gift to the world</span></h2>
                    </div>
                    <div className="grid-4">
                        {impactFeatures.map((f, i) => (
                            <div key={i} className="card glass fade-up" style={{ animationDelay: `${(i + 4) * 0.1}s`, textAlign: 'center', padding: '3rem 2rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.1))' }}>{f.icon}</div>
                                <h3 style={{ fontWeight: 800, marginBottom: '1rem', fontSize: '1.2rem' }}>{f.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Impact Spotlight (08 Requirement - Non-cliché polish) */}
            <section style={{ padding: '4rem 2rem', background: 'linear-gradient(to bottom, transparent, rgba(39, 174, 96, 0.03))' }}>
                <div className="container">
                    <div className="card glass-gold" style={{ padding: '4rem', borderRadius: '40px' }}>
                        <div style={{ display: 'flex', gap: '4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '8rem', flexShrink: 0 }}>🌳</div>
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <div style={{ color: 'var(--green-light)', fontWeight: 900, letterSpacing: '0.15em', marginBottom: '1.5rem', fontSize: '0.8rem' }}>THE IMPACT SPOTLIGHT</div>
                                <h2 style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: '1.5rem' }}>The Green Fairways Project</h2>
                                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2.5rem' }}>
                                    We believe the courses we love should thrive for generations.
                                    By partnering with ecological experts, we transform local greens into
                                    biodiverse sanctuaries for native wildlife.
                                    <strong> Your rounds are planting 5,000+ trees this year alone.</strong>
                                </p>
                                <div style={{ display: 'flex', gap: '3rem' }}>
                                    <div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--gold)' }}>£12,450</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6, letterSpacing: '0.05em' }}>COLLECTIVE FUNDING</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--gold)' }}>842</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6, letterSpacing: '0.05em' }}>ACTIVE STEWARDS</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section style={{ padding: '8rem 2rem', textAlign: 'center', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
                <div className="container" style={{ maxWidth: '700px' }}>
                    <h2 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1.5rem' }}>Ready to play<br /><span className="gold-text">for something more?</span></h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '3rem', lineHeight: 1.6 }}>
                        Join 1,240+ golfers who are making every stableford point count towards a better world.
                    </p>
                    <Link to="/register" className="btn btn-primary btn-lg btn-shimmer" style={{ padding: '1.2rem 3.5rem' }}>Become an Impact Member</Link>
                    <p style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Choose between Monthly (£9.99) or Yearly (£99.99) options</p>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>✨</div>
                <span>GolfGives Collective © 2024 · Purpose · Passion · Prizes</span>
            </footer>
        </div>
    );
}
