// Supabase configuration
// NOTE: The actual client is now initialized in services-apis/supabase/client.js
// This file provides backwards compatibility for legacy code

const supabaseConfig = {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://agdvozsqcrszflzsimyl.supabase.co',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZHZvenNxY3JzemZsenNpbXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDUzODksImV4cCI6MjA2OTM4MTM4OX0.pgYBlwUqLZZ7I5EOD1LFcSeBrrTy1Jf1Ep8zLjYj3LQ'
};

// Global Supabase client - will use the unified client from client.js
let supabaseClient = null;

// Initialize Supabase client - returns the unified client
function initializeSupabase() {
    // Check if unified client is already available (from client.js)
    if (window.__supabaseClient) {
        supabaseClient = window.__supabaseClient;
        console.log('[config.js] Using unified Supabase client');
        return supabaseClient;
    }

    // Fallback: create client using window.supabase (CDN version) if needed
    if (window.supabase && window.supabase.createClient) {
        console.warn('[config.js] Creating Supabase client (unified client not found)');
        supabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.key);
        // Register globally to avoid multiple GoTrue instances
        window.__supabaseClient = supabaseClient;
        return supabaseClient;
    }

    console.error('[config.js] Supabase client not available');
    return null;
}

// Get the initialized client
function getSupabaseClient() {
    // Prefer the unified client
    if (window.__supabaseClient) {
        return window.__supabaseClient;
    }

    if (!supabaseClient) {
        return initializeSupabase();
    }
    return supabaseClient;
}

// Verify user authentication before making protected calls
async function verifyUserSession() {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Error verifying user session:', error);
        return null;
    }
}

// Make functions globally available
window.supabaseConfig = supabaseConfig;
window.initializeSupabase = initializeSupabase;
window.getSupabaseClient = getSupabaseClient;
window.verifyUserSession = verifyUserSession;