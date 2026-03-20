import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function Checkout() {
    const { user, updateSubscription } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Details, 2: Processing, 3: Success

    const plan = location.state?.plan || 'monthly';
    const price = plan === 'yearly' ? '£99.99' : '£9.99';

    useEffect(() => {
        if (!user) navigate('/login', { state: { from: location } });
    }, [user, navigate, location]);

    const handlePayment = async (e) => {
        e.preventDefault();
        setStep(2);

        // Simulate Stripe Processing
        setTimeout(async () => {
            try {
                await updateSubscription(plan);

                // 23 Commercial Expansion - Simulated Email Receipt
                await supabase.from('notifications').insert({
                    user_id: user.id,
                    title: '🧾 Payment Receipt: GolfGives',
                    message: `Thank you for your ${price} subscription payment. 10% has been successfully routed to your active charity.`,
                    type: 'system'
                });

                setStep(3);
                const destination = location.state?.from?.pathname || '/dashboard';
                setTimeout(() => navigate(destination), 2000);
            } catch (err) {
                alert("Payment failed simulation. Please try again.");
                setStep(1);
            }
        }, 3000);
    };

    if (step === 3) {
        return (
            <div className="page center-vh">
                <div className="card fade-up" style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '2rem' }}>🎉</div>
                    <h1 className="gold-text">Success!</h1>
                    <p style={{ marginTop: '1rem' }}>Your {plan} membership is now active.</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page" style={{ padding: '4rem 2rem' }}>
            <div className="container" style={{ maxWidth: '1000px' }}>
                <div className="grid-2" style={{ gap: '4rem', alignItems: 'start' }}>

                    <div className="fade-up">
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '2rem' }}>← Back</button>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Complete Your <span className="gold-text">Upgrade</span></h1>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>
                            Secure payment processing via Stripe.
                            10% of your fee supports your selected charity.
                        </p>

                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ fontWeight: 600 }}>GolfGives {plan.charAt(0).toUpperCase() + plan.slice(1)} Passport</span>
                                <span>{price}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <span>Charity Donation (10%)</span>
                                <span>- Included</span>
                            </div>
                            <hr style={{ margin: '1.5rem 0', border: '0', borderTop: '1px solid var(--border-subtle)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.25rem' }}>
                                <span>Total Due</span>
                                <span className="gold-text">{price}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card fade-up" style={{ animationDelay: '0.2s', padding: '3rem' }}>
                        {step === 2 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                                <div className="spinner" style={{ margin: '0 auto 2rem' }}></div>
                                <h3 className="gold-text">Processing Security...</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>Talking to payment gateway...</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
                                    <button onClick={handlePayment} className="btn-pay apple-pay"> Pay</button>
                                    <button onClick={handlePayment} className="btn-pay google-pay">G Pay</button>
                                    <button onClick={handlePayment} className="btn-pay paypal-pay">PayPal</button>
                                </div>

                                <div style={{ textAlign: 'center', margin: '2rem 0', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    <hr style={{ flex: 1, border: '0', borderTop: '1px solid var(--border-subtle)' }} />
                                    OR CONTINUE WITH CARD
                                    <hr style={{ flex: 1, border: '0', borderTop: '1px solid var(--border-subtle)' }} />
                                </div>

                                <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div className="form-group">
                                        <label>Cardholder Name</label>
                                        <input type="text" placeholder={user?.name} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Card Number</label>
                                        <input type="text" placeholder="xxxx xxxx xxxx xxxx" defaultValue="4242 4242 4242 4242" required />
                                    </div>
                                    <div className="grid-2">
                                        <div className="form-group">
                                            <label>Expiry</label>
                                            <input type="text" placeholder="MM/YY" defaultValue="12/26" required />
                                        </div>
                                        <div className="form-group">
                                            <label>CVC</label>
                                            <input type="text" placeholder="123" defaultValue="123" required />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '1.2rem', background: 'var(--gold)', color: '#000' }}>
                                        🔒 Pay {price} Securely
                                    </button>
                                </form>
                            </>
                        )}
                    </div>

                </div>
            </div>
            <style>{`
                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(212, 175, 55, 0.1);
                    border-top: 4px solid var(--gold);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .center-vh { display: flex; align-items: center; justifyContent: center; min-height: 80vh; }
                .btn-pay { flex: 1; height: 50px; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 1rem; transition: 0.2s; }
                .btn-pay:hover { opacity: 0.8; transform: translateY(-2px); }
                .apple-pay { background: #fff; color: #000; font-size: 1.2rem; }
                .google-pay { background: #202124; color: #fff; border: 1px solid #5f6368; }
                .paypal-pay { background: #ffc439; color: #2c2e2f; }
            `}</style>
        </div>
    );
}
