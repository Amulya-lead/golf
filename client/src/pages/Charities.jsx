import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Charities() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [charities, setCharities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [success, setSuccess] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        supabase.from('charities').select('*').order('total_received', { ascending: false })
            .then(({ data }) => { if (data) setCharities(data); setLoading(false); });
    }, []);

    const filteredCharities = charities.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['all', 'health', 'education', 'environment', 'sport', 'community'];
    const featuredCharity = charities[0]; // Spotlight the top charity

    const selectCharity = async (id) => {
        setSaving(id); setSuccess('');
        try {
            if (!user) throw new Error('Not logged in');
            const { error } = await supabase.from('profiles').update({ selected_charity_id: id }).eq('id', user.id);
            if (error) throw error;
            await refreshUser();
            setSuccess('Charity updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
            alert('Failed to update charity.');
        } finally { setSaving(null); }
    };

    const [showDonationModal, setShowDonationModal] = useState(false);
    const [selectedCharityForDonation, setSelectedCharityForDonation] = useState(null);
    const [donationAmount, setDonationAmount] = useState('10');
    const [donating, setDonating] = useState(false);

    const handleDonation = async () => {
        if (!user || !selectedCharityForDonation) return;
        setDonating(true);
        try {
            const amount = parseFloat(donationAmount);
            if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');

            // 1. Record Donation
            const { error: donationError } = await supabase.from('donations').insert({
                user_id: user.id,
                charity_id: selectedCharityForDonation.id,
                amount: amount,
                payment_method: 'simulated_card'
            });
            if (donationError) throw donationError;

            // 2. Update Charity Stats
            const { error: charityError } = await supabase.from('charities').update({
                total_received: (selectedCharityForDonation.total_received || 0) + amount,
                supporter_count: (selectedCharityForDonation.supporter_count || 0) + 1
            }).eq('id', selectedCharityForDonation.id);
            if (charityError) throw charityError;

            // 3. Update User Stats
            const { error: profileError } = await supabase.from('profiles').update({
                total_contributed: (user.total_contributed || 0) + amount
            }).eq('id', user.id);
            if (profileError) throw profileError;

            await refreshUser();
            setSuccess(`Donation of £${amount.toFixed(2)} to ${selectedCharityForDonation.name} successful!`);
            setShowDonationModal(false);
            setDonationAmount('10');

            // Refresh charities list to show updated totals
            const { data } = await supabase.from('charities').select('*').order('total_received', { ascending: false });
            if (data) setCharities(data);

            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            console.error(err);
            alert('Donation failed: ' + err.message);
        } finally {
            setDonating(false);
        }
    };

    const DonationModal = () => (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="card fade-up" style={{ maxWidth: '450px', width: '100%', background: 'linear-gradient(135deg, #0d1219 0%, #05070a 100%)', border: '1px solid var(--gold)', padding: '2.5rem', position: 'relative' }}>
                <button onClick={() => setShowDonationModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{selectedCharityForDonation?.logo_emoji}</div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>Support {selectedCharityForDonation?.name}</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Your contribution makes a world of difference.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    {['5', '10', '25'].map(amt => (
                        <button
                            key={amt}
                            onClick={() => setDonationAmount(amt)}
                            style={{ padding: '0.8rem', borderRadius: '10px', border: donationAmount === amt ? '2px solid var(--gold)' : '1px solid var(--border-subtle)', background: donationAmount === amt ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', color: donationAmount === amt ? 'var(--gold)' : 'var(--text-primary)', fontWeight: 800, cursor: 'pointer' }}
                        >
                            £{amt}
                        </button>
                    ))}
                </div>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--gold)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Custom Amount</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--gold)' }}>£</span>
                        <input
                            type="number"
                            className="form-input"
                            value={donationAmount}
                            onChange={(e) => setDonationAmount(e.target.value)}
                            style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={handleDonation} disabled={donating} style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem' }}>
                        {donating ? '⚡ Processing...' : `Donate £${parseFloat(donationAmount || 0).toFixed(2)} Now`}
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', opacity: 0.5, fontSize: '1.2rem' }}>
                        <span>💳</span><span>🍎Pay</span><span>📱Pay</span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>Secure simulated transaction. No real funds will be taken.</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="page">
            {showDonationModal && <DonationModal />}
            <div className="container" style={{ paddingBottom: '4rem' }}>
                <div className="page-header">
                    <h1 className="page-title">💚 Charity <span className="gold-text">Directory</span></h1>
                    <p className="page-subtitle">Support your favorite causes through your monthly participation</p>
                </div>

                {/* Spotlight Section (08 Requirement) */}
                {!loading && featuredCharity && !searchTerm && selectedCategory === 'all' && (
                    <div className="card fade-up" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid var(--gold)', marginBottom: '3rem', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '5rem' }}>{featuredCharity.logo_emoji}</div>
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <div className="badge badge-gold" style={{ marginBottom: '1rem' }}>MONTHLY SPOTLIGHT</div>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1rem' }}>{featuredCharity.name}</h2>
                                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>{featuredCharity.description}</p>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="btn btn-primary" onClick={() => selectCharity(featuredCharity.id)} disabled={user?.selectedCharity?.id === featuredCharity.id}>
                                        {user?.selectedCharity?.id === featuredCharity.id ? '✓ Supporting' : 'Support this Charity'}
                                    </button>
                                    <button className="btn btn-ghost" onClick={() => { setSelectedCharityForDonation(featuredCharity); setShowDonationModal(true); }}>Independent Donation</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search and Filter (08 Requirement) */}
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search charities..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '3rem', marginBottom: 0 }}
                        />
                        <span style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '10px' }}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                    padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    background: selectedCategory === cat ? 'var(--gold)' : 'transparent',
                                    color: selectedCategory === cat ? '#000' : 'var(--text-muted)',
                                    fontWeight: 700, textTransform: 'capitalize'
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {success && <div className="alert alert-success">✓ {success}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {loading ? (
                        <div className="loading-center" style={{ gridColumn: '1/-1' }}><div className="spinner" /></div>
                    ) : filteredCharities.map(c => {
                        const isSelected = user?.selectedCharity?.id === c.id;
                        return (
                            <div key={c.id} className="card fade-up" style={{
                                border: isSelected ? '2px solid var(--gold)' : '1px solid var(--border-subtle)',
                                background: isSelected ? 'rgba(212,175,55,0.03)' : 'var(--bg-card)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '2.5rem' }}>{c.logo_emoji}</div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontWeight: 800 }}>{c.name}</h3>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: categoryColors[c.category] || 'var(--text-muted)' }}>{c.category}</span>
                                    </div>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', height: '4.8rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: '1.5rem' }}>
                                    {c.description}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                    <div><strong style={{ color: 'var(--green-light)' }}>£{c.total_received.toFixed(2)}</strong> raised</div>
                                    <div><strong>{c.supporter_count}</strong> supporters</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className={`btn ${isSelected ? 'btn-ghost' : 'btn-primary'}`}
                                        style={{ flex: 1 }}
                                        disabled={isSelected || saving === c.id}
                                        onClick={() => !isSelected && selectCharity(c.id)}
                                    >
                                        {isSelected ? '✓ Selected' : 'Support'}
                                    </button>
                                    <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={() => { setSelectedCharityForDonation(c); setShowDonationModal(true); }}>🎁</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
