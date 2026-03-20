import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: auth, error: loginErr } = await supabase.auth.signInWithPassword({
        email: 'admin@charity.golf',
        password: 'password123'
    });

    if (loginErr) {
        console.log("Login failed!", loginErr);
        return;
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', auth.user.id).single();
    console.log("Profile Role is:", profile.role);

    if (profile.role !== 'admin') {
        console.log("Fixing it now...");
        await supabase.from('profiles').update({ role: 'admin' }).eq('id', auth.user.id);
        const { data: latest } = await supabase.from('profiles').select('role').eq('id', auth.user.id).single();
        console.log("Profile Role is now:", latest.role);
    }
}
check();
