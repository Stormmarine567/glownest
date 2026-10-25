// Controlled one-time setup of the FIRST Super Admin.
//
//   SUPER_ADMIN_EMAIL=you@domain.com SUPER_ADMIN_PASSWORD='long-random-pass' npm run create-super-admin
//
// - Runs on your machine/CI only, using the service-role key (never shipped to the browser).
// - Refuses to run if a Super Admin already exists, so it cannot be abused to add more.
// - Public sign-up can never create this role: the database trigger always creates 'customer'.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD;

if (!url || !key) fail('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('Set a valid SUPER_ADMIN_EMAIL.');
if (!password || password.length < 12) fail('SUPER_ADMIN_PASSWORD must be at least 12 characters.');

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { count, error: countErr } = await admin
  .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'super_admin');
if (countErr) fail(`Could not check existing admins: ${countErr.message}`);
if (count && count > 0) fail('A Super Admin already exists. Manage admins from the dashboard instead.');

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email, password, email_confirm: true, user_metadata: { full_name: 'Super Admin' },
});
if (createErr) fail(`Could not create user: ${createErr.message}`);

const { error: roleErr } = await admin
  .from('profiles').update({ role: 'super_admin', full_name: 'Super Admin' }).eq('id', created.user.id);
if (roleErr) fail(`User created but promotion failed: ${roleErr.message}`);

console.log(`Super Admin created: ${email}\nSign in at /login, then open /admin. Remove SUPER_ADMIN_* from your environment now.`);

function fail(msg) { console.error(`✖ ${msg}`); process.exit(1); }
