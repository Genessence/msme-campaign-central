// Script to create a test user using the Supabase service role key.
// Usage (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"; $env:VITE_SUPABASE_URL="https://<ref>.supabase.co"; npm run create:test-user
// Never expose the service role key to the browser / client code.

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error('[create-test-user] Missing VITE_SUPABASE_URL (or SUPABASE_URL).');
  process.exit(1);
}
if (!serviceRoleKey) {
  console.error('[create-test-user] Missing SUPABASE_SERVICE_ROLE_KEY env var.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const email = process.env.TEST_USER_EMAIL || 'test.user@example.com';
const password = process.env.TEST_USER_PASSWORD || 'Password123!';
const fullName = process.env.TEST_USER_NAME || 'Test User';

async function preflightSchemaCheck() {
  const requiredTables = ['vendors','msme_campaigns','msme_responses'];
  const missing = [];
  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true }).limit(1);
    if (error) {
      // Postgres undefined table is 42P01, but supabase-js wraps; we just treat any error at this stage as missing
      missing.push(table);
    }
  }
  if (missing.length) {
    console.error('\n[create-test-user] Detected missing tables:', missing.join(', '));
    console.error('[create-test-user] Your database schema has not been applied. Apply migrations first.');
    console.error('Options:');
    console.error('  1. Open Supabase Dashboard > SQL Editor, paste contents of supabase/migrations/20250829090000-init-schema-idempotent.sql, run it.');
    console.error('  2. Or install Supabase CLI and run: supabase login ; supabase link --project-ref <ref> ; supabase migration up');
    console.error('Re-run this script after the schema exists.');
    process.exit(2);
  }
}

try {
  await preflightSchemaCheck();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });
  if (error) {
    console.error('[create-test-user] Error creating user:', error.message);
    console.error('Common causes:');
    console.error(' - Using anon key instead of service role key');
    console.error(' - Password not meeting policy');
    console.error(' - Email already exists');
    process.exit(1);
  }
  // Optional: create matching profile row
  if (data.user?.id) {
    await supabase.from('profiles').upsert({ id: data.user.id, full_name: fullName, role: 'admin' });
  }
  console.log('[create-test-user] Created user id:', data.user?.id, 'email:', data.user?.email);
  process.exit(0);
} catch (e) {
  console.error('[create-test-user] Unexpected failure:', e);
  process.exit(1);
}
