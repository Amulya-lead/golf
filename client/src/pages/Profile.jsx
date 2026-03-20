import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Profile() {
    const { user } = useAuth();
    const [calc, setCalc] = useState({ rx: 0, ry: 0, tx: 50, ty: 50, active: false });

    if (!user) return <div className="page loading-center"><div className="spinner" /></div>;

    const handleMouseMove = (e) => {
        const bounds = e.currentTarget.getBoundingClientRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;

        // Tilt calculation (max 15 degrees)
        const rx = (mouseY / (bounds.height / 2)) * -15;
        const ry = (mouseX / (bounds.width / 2)) * 15;

        // Glare calculation
        const tx = ((e.clientX - bounds.left) / bounds.width) * 100;
        const ty = ((e.clientY - bounds.top) / bounds.height) * 100;

        setCalc({ rx, ry, tx, ty, active: true });
    };

    const handleMouseLeave = () => {
        setCalc({ rx: 0, ry: 0, tx: 50, ty: 50, active: false });
    };

    return (
        <div className="page" style={{ perspective: '1200px' }}>
            <div className="container" style={{ maxWidth: '800px' }}>

                {/* 3D Holographic Player Card */}
                <div
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        margin: '0 auto 4rem',
                        width: '100%',
                        maxWidth: '400px',
                        height: '550px',
                        transformStyle: 'preserve-3d',
                        transform: `rotateX(${calc.rx}deg) rotateY(${calc.ry}deg)`,
                        transition: calc.active ? 'none' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        position: 'relative',
                        borderRadius: '24px',
                        background: 'linear-gradient(135deg, rgba(20,20,20,0.95), rgba(5,5,5,0.98))',
                        boxShadow: calc.active
                            ? `0 30px 60px rgba(0,0,0,0.6), ${calc.ry}px ${-calc.rx}px 30px rgba(201, 168, 76, 0.2)`
                            : '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(201, 168, 76, 0.1)',
                        border: '1px solid rgba(201, 168, 76, 0.3)',
                        overflow: 'hidden',
                        cursor: 'pointer'
                    }}
                >
                    {/* Holographic Glare Layer */}
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
                        background: `radial-gradient(circle at ${calc.tx}% ${calc.ty}%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 60%)`,
                        opacity: calc.active ? 1 : 0,
                        transition: 'opacity 0.3s ease'
                    }} />

                    {/* Card Content */}
                    <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                            <div className="badge badge-gold" style={{ fontSize: '0.7rem', letterSpacing: '2px', padding: '0.4rem 0.8rem' }}>PLAYER EDITION</div>
                            <div style={{ fontSize: '1.5rem', color: 'var(--gold)', textShadow: '0 0 10px rgba(201, 168, 76, 0.5)' }}>#{(user.id || '001').toString().slice(0, 5).toUpperCase()}</div>
                        </div>

                        <div className="avatar-bubble" style={{
                            width: '140px', height: '140px', fontSize: '3.5rem', margin: '0 auto 2rem',
                            background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: '#000',
                            boxShadow: '0 10px 30px rgba(201, 168, 76, 0.4)'
                        }}>
                            {user.avatarInitials || user.name?.[0]?.toUpperCase()}
                        </div>

                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px', marginBottom: '0.5rem', transform: 'translateZ(30px)' }}>{user.name}</h1>
                            <p style={{ color: 'var(--gold)', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase' }}>{user.role} MEMBER</p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', transform: 'translateZ(20px)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Handicap</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>{user.handicap}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Lifetime Impact</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4cd137', textShadow: '0 0 10px rgba(76, 209, 55, 0.3)' }}>£{(user.totalContributed || 0).toFixed(0)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid-2" style={{ gap: '2rem' }}>
                    <section className="card glass">
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 800 }}>Account Details</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>{user.name}</div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>{user.email || 'N/A'}</div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Member Since</label>
                                <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>{new Date(user.created_at).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </section>

                    <section className="card glass">
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 800 }}>Impact & Performance</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Current Handicap</span>
                                <strong className="gold-text">{user.handicap}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Total Contributed</span>
                                <strong className="gold-text">£{(user.totalContributed || 0).toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Draw Entries</span>
                                <strong>{user.drawEntries || 0}</strong>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="card glass" style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Manage Your Presence</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        Need to update your handicap or change your personal mission? Contact our support team for administrative adjustments.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <Link to="/dashboard" className="btn btn-secondary btn-sm">Back to Dashboard</Link>
                        <button className="btn btn-primary btn-sm" onClick={() => alert('Profile editing is currently limited as per security protocols.')}>Edit Profile</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
