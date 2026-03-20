import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const plans = [
    { id: 'monthly', label: 'Monthly Option', price: '£9.99', period: '/month', desc: 'Full access to tracking and draws. Cancel anytime.', popular: false },
    { id: 'yearly', label: 'Yearly Passport', price: '£99.99', period: '/year', desc: 'Save 17% and get uninterrupted tracking all season.', popular: true },
];

export default function Pricing() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="page" style={{ padding: '4rem 2rem 8rem' }}>
            <div className="container" style={{ maxWidth: '900px' }}>
                <div className="page-header" style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h1 className="page-title" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                        Choose Your <span className="gold-text">Membership</span>
                    </h1>
                    <p className="page-subtitle" style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                        10% of your subscription goes directly to your chosen charity.
                    </p>
                    {user && user.subscriptionStatus !== 'active' && (
                        <div style={{ marginTop: '2rem' }}>
                            <button
                                onClick={() => navigate('/checkout', { state: { plan: 'monthly', from: location.state?.from } })}
                                className="btn btn-primary"
                                style={{ background: 'var(--gold)', color: '#000' }}
                            >
                                ⚡ Fast Track: Activate Account
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid-2">
                    {plans.map(p => {
                        const isCurrent = user?.subscriptionPlan === p.id && user?.subscriptionStatus === 'active';

                        return (
                            <div key={p.id} className="card card-gold" style={{
                                position: 'relative',
                                border: p.popular ? '2px solid var(--gold)' : '1px solid var(--border-subtle)',
                                padding: '3rem 2.5rem',
                                display: 'flex', flexDirection: 'column',
                                opacity: isCurrent ? 0.8 : 1
                            }}>
                                {isCurrent && (
                                    <div style={{
                                        position: 'absolute', top: 0, right: '2rem', transform: 'translateY(-50%)',
                                        background: 'var(--green-light)', color: '#000', padding: '0.3rem 1rem',
                                        borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem'
                                    }}>CURRENT PLAN</div>
                                )}
                                {p.popular && !isCurrent && (
                                    <div style={{
                                        position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)',
                                        background: 'var(--gold)', color: '#080b12', padding: '0.4rem 1.5rem',
                                        borderRadius: '100px', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.05em',
                                        textTransform: 'uppercase'
                                    }}>Most Popular</div>
                                )}
                                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>{p.label}</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{p.desc}</p>

                                <div style={{ marginBottom: '2.5rem' }}>
                                    <span style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'Outfit', color: p.popular ? 'var(--gold)' : '#fff' }}>{p.price}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{p.period}</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, marginBottom: '2.5rem' }}>
                                    {['Submit unlimited scorecards', 'Track handicap and Stableford points', 'Earn monthly draw tickets', 'Support a charity every month', 'Compete on the national leaderboard'].map((feat, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--green-light)', fontSize: '1.2rem' }}>✓</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>{feat}</span>
                                        </div>
                                    ))}
                                </div>

                                {isCurrent ? (
                                    <button className="btn btn-ghost" disabled style={{ width: '100%', opacity: 0.5 }}>Active Plan</button>
                                ) : (
                                    <Link
                                        to={user ? "/checkout" : "/register"}
                                        state={{
                                            plan: p.id,
                                            from: location.state?.from // Preserve the original destination
                                        }}
                                        className={`btn ${p.popular ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem' }}
                                    >
                                        {user ? 'Upgrade Now' : `Start ${p.label}`}
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
