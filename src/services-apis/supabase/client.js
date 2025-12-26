import { createClient } from '@supabase/supabase-js';

// Prefer environment variables, but keep a fallback to avoid breaking local dev
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://agdvozsqcrszflzsimyl.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZHZvenNxY3JzemZsenNpbXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDUzODksImV4cCI6MjA2OTM4MTM4OX0.pgYBlwUqLZZ7I5EOD1LFcSeBrrTy1Jf1Ep8zLjYj3LQ';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('[Supabase Client] Using fallback Supabase URL/key from source. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for production.');
}

// Reuse global client if it already exists (prevents multiple GoTrue instances)
let supabaseSingleton = null;
if (typeof window !== 'undefined' && window.__supabaseClient) {
    supabaseSingleton = window.__supabaseClient;
} else {
    supabaseSingleton = createClient(supabaseUrl, supabaseKey, {
        auth: {
            // Ensure proper session persistence in localStorage
            persistSession: true,
            // Enable automatic token refresh
            autoRefreshToken: true,
            // Detect OAuth callbacks in URL
            detectSessionInUrl: true,
        },
    });
}

export const supabase = supabaseSingleton;

// Expose the client globally for legacy code compatibility
// This ensures all code uses the SAME Supabase instance
if (typeof window !== 'undefined') {
    // Make the client available globally
    window.__supabaseClient = supabase;

    // Override the legacy getSupabaseClient to return our unified client
    window.getSupabaseClient = () => supabase;

    console.log('[Supabase Client] Initialized');
}
