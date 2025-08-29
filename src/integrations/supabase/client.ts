// Supabase client centralised factory.
// NOTE: Moved to use environment variables for security / configurability.
// Existing hard‑coded values kept as fallback so current deployments keep working
// without requiring immediate .env changes. Remove fallbacks once env vars are set.
// Import usage: import { supabase } from "@/integrations/supabase/client";

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Vite exposes env vars prefixed with VITE_. Define placeholders in .env / deployment.
// SECURITY: Do NOT commit real service_role keys; always use the anon public key here.
const FALLBACK_SUPABASE_URL = "https://ngowayhnjjrzrjfwhdbw.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nb3dheWhuampyenJqZndoZGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4ODEwMjQsImV4cCI6MjA2NzQ1NzAyNH0.q_dEcf6U7-CklI4INsRICcGX23y50N6mgt4CvJj1CJk";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Using fallback embedded credentials. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file to override.');
}