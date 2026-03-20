import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Profile() {
    const { user } = useAuth();

    if (!user) return <div className="page loading-center"><div className="spinner" /></div>;

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: '800px' }}>
                <header className="page-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div className="avatar-bubble" style={{ width: '100px', height: '100px', fontSize: '2.5rem', margin: '0 auto 1.5rem', background: 'var(--gold)', color: '#000' }}>
                        {user.avatarInitials || user.name?.[0]?.toUpperCase()}
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900 }}>{user.name}</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{user.role.toUpperCase()} MEMBER</p>
                </header>

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
