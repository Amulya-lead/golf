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

    const categoryColors = { health: '#e74c3c', education: '#3498db', environment: '#27ae60', sport: '#c9a84c', community: '#9b59b6' };

    return (
        <div className="page">
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
                                    <button className="btn btn-ghost" onClick={() => alert('One-off donation flow...')}>Independent Donation</button>
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
                                    <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={() => alert('One-off donation flow...')}>🎁</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
