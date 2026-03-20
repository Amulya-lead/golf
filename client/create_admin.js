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

async function createAdmin() {
    console.log("Creating admin account...");
    const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: 'admin@charity.golf',
        password: 'password123',
        options: {
            data: {
                name: 'Super Admin',
                is_username_account: true
            }
        }
    });

    if (authErr) {
        if (authErr.message.includes('User already registered')) {
            console.log("Account already registered! Attempting to login to get session for profile update...");
            const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
                email: 'admin@charity.golf',
                password: 'password123'
            });
            if (loginErr) {
                console.error("Failed to login to the existing account. Is the password correct? Error:", loginErr.message);
                return;
            }
            // Update role
            const { error: upErr } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', loginData.user.id);
            if (upErr) console.error("Error making existing user an admin:", upErr.message);
            else console.log("Existing account successfully upgraded to Admin!");
        } else {
            console.error("Failed to create admin account:", authErr.message);
        }
        return;
    }

    console.log("Account created successfully!");
    console.log("Giving the database trigger 2 seconds to create the profile row...");
    await new Promise(r => setTimeout(r, 2000));

    console.log("Upgrading profile permissions to Admin...");
    const { error: upErr } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', authData.user.id);

    if (upErr) {
        console.error("Failed to set role to admin (RLS might prevent anon key from updating roles).", upErr.message);
        console.log("Please run the SQL command in Supabase to finish upgrading!");
    } else {
        console.log("==========================================");
        console.log("✅ SUCCESS! ADMIN ACCOUNT CREATED & SECURED");
        console.log("Username: admin");
        console.log("Password: password123");
        console.log("==========================================");
    }
}

createAdmin();
