import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (authId) => {
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', authId).single();
            if (error || !data) return null;

            let charity = null;
            if (data.selected_charity_id) {
                const { data: cData } = await supabase.from('charities').select('*').eq('id', data.selected_charity_id).single();
                charity = cData;
            }

            const { data: subData } = await supabase.from('subscriptions').select('*').eq('user_id', authId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();

            return {
                id: data.id, name: data.name, role: data.role, handicap: data.handicap,
                subscriptionStatus: subData?.status || data.subscription_status || 'inactive',
                subscriptionPlan: subData?.plan || data.subscription_plan || null,
                nextBillingDate: subData?.next_billing_date || null,
                selectedCharity: charity || null,
                drawEntries: data.draw_entries, totalContributed: data.total_contributed,
                avatarInitials: data.avatar_initials, email: '',
                currentStreak: data.current_streak || 0,
                lastActivityAt: data.last_activity_at || null

            };
        } catch (e) {
            console.error("fetchProfile error:", e);
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;

        const handleAuth = async (session) => {
            if (session) {
                const profile = await fetchProfile(session.user.id);
                if (mounted) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email,
                        name: profile?.name || session.user.user_metadata?.name || 'Golfer',
                        role: profile?.role || 'user',
                        handicap: profile?.handicap || 0,
                        subscriptionStatus: profile?.subscriptionStatus || 'active',
                        subscriptionPlan: profile?.subscriptionPlan || 'monthly',
                        drawEntries: profile?.drawEntries || 0,
                        selectedCharity: profile?.selectedCharity || null,
                        avatarInitials: profile?.avatarInitials || '⛳',
                        currentStreak: profile?.currentStreak || 0,
                        lastActivityAt: profile?.lastActivityAt || null
                    });
                }
            } else {
                if (mounted) setUser(null);
            }
            if (mounted) setLoading(false);
        };

        // Combine getSession and onAuthStateChange
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleAuth(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoading(false);
            } else if (session) {
                handleAuth(session);
            } else if (!session && event !== 'INITIAL_SESSION') {
                setLoading(false);
            }
        });

        const failsafe = setTimeout(() => {
            if (mounted && loading) setLoading(false);
        }, 3000);

        return () => {
            mounted = false;
            subscription?.unsubscribe();
            clearTimeout(failsafe);
        };
    }, []);

    const formatIdentifier = (identifier) => {
        if (!identifier) return '';
        if (identifier.includes('@')) return identifier.toLowerCase();
        return `${identifier.toLowerCase().replace(/[^a-z0-9]/g, '')}@charity.golf`;
    };

    const login = async (identifier, password) => {
        const formattedEmail = formatIdentifier(identifier);
        console.log("Attempting login for:", formattedEmail);

        const { error, data } = await supabase.auth.signInWithPassword({ email: formattedEmail, password });
        if (error) throw error;

        // Eagerly set user to bypass any broken AuthState listeners
        const profile = await fetchProfile(data.user.id);
        const userData = {
            id: data.user.id,
            email: data.user.email,
            name: profile?.name || data.user.user_metadata?.name || 'Golfer',
            role: profile?.role || 'user',
            handicap: profile?.handicap || 0,
            subscriptionStatus: profile?.subscriptionStatus || 'active',
            subscriptionPlan: profile?.subscriptionPlan || 'monthly',
            drawEntries: profile?.drawEntries || 0,
            selectedCharity: profile?.selectedCharity || null,
            avatarInitials: profile?.avatarInitials || '⛳',
            currentStreak: profile?.currentStreak || 0,
            lastActivityAt: profile?.lastActivityAt || null
        };

        console.log("Login success. User role:", userData.role);
        setUser(userData);
        setLoading(false);
        return { data, profile: userData };
    };

    const register = async (name, identifier, password, plan) => {
        const { data, error } = await supabase.auth.signUp({
            email: formatIdentifier(identifier), password,
            options: { data: { name, plan, is_username_account: !identifier.includes('@') } }
        });
        if (error) throw error;
        setLoading(false);
        return data;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
    };

    const refreshUser = async () => {
        if (user?.id) {
            const profile = await fetchProfile(user.id);
            if (profile) setUser(prev => ({ ...prev, ...profile }));
        }
    };

    const updateSubscription = async (plan) => {
        if (!user) return;
        const amount = plan === 'yearly' ? 99.99 : 9.99;
        const nextDate = new Date();
        plan === 'yearly' ? nextDate.setFullYear(nextDate.getFullYear() + 1) : nextDate.setMonth(nextDate.getMonth() + 1);

        const { error: subErr } = await supabase.from('subscriptions').insert({
            user_id: user.id, plan, amount, status: 'active',
            next_billing_date: nextDate, mock_payment_id: 'MOCK_' + Math.random().toString(36).substr(2, 9)
        });
        if (subErr) throw subErr;

        const { error: profErr } = await supabase.from('profiles').update({
            subscription_status: 'active', subscription_plan: plan
        }).eq('id', user.id);
        if (profErr) throw profErr;

        await refreshUser();
    };

    const cancelSubscription = async () => {
        if (!user) return;
        const { error } = await supabase.from('subscriptions').update({
            status: 'cancelled'
        }).eq('user_id', user.id).eq('status', 'active');
        if (error) throw error;

        await supabase.from('profiles').update({
            subscription_status: 'cancelled'
        }).eq('id', user.id);

        await refreshUser();
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, updateSubscription, cancelSubscription }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
