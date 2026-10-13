import { createClient } from '@supabase/supabase-js';

// Vite supplies import.meta.env in the browser. The local Gatepass sync agent
// runs the same import service in Node, where configuration comes from process.env.
const runtimeEnv = import.meta.env || globalThis.process?.env || {};
const SUPABASE_URL = runtimeEnv.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = runtimeEnv.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
