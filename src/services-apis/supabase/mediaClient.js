
import { createClient } from '@supabase/supabase-js';

const MEDIA_SUPABASE_URL = import.meta.env.VITE_MEDIA_SUPABASE_URL || 'https://qeckbczlymcidnuqtrxc.supabase.co';
const MEDIA_SUPABASE_KEY = import.meta.env.VITE_MEDIA_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlY2tiY3pseW1jaWRudXF0cnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjczODgsImV4cCI6MjA3MzcwMzM4OH0.X-7la7rqgc605B-ylVpT2dODYdoLNzGyNAfCkO08QLE';

if (!import.meta.env.VITE_MEDIA_SUPABASE_URL || !import.meta.env.VITE_MEDIA_SUPABASE_ANON_KEY) {
    console.warn('[MediaClient] Using fallback media Supabase URL/key from source. Configure VITE_MEDIA_SUPABASE_URL and VITE_MEDIA_SUPABASE_ANON_KEY.');
}

// Singleton instance - created on demand (also reuse any existing global to avoid multiple GoTrue clients)
let _mediaClient = null;

/**
 * Get the media Supabase client (lazy loaded)
 * This pattern avoids creating multiple GoTrueClient instances at startup,
 * which was causing conflicts with the main auth client.
 * 
 * The client is created only when first accessed (when visiting Midias or Anuncios pages)
 * and reused for subsequent calls.
 */
export const getMediaSupabase = () => {
    if (!_mediaClient) {
        // Check if another instance was already created in this browser context
        if (typeof window !== 'undefined' && window.__mediaSupabaseClient) {
            _mediaClient = window.__mediaSupabaseClient;
            return _mediaClient;
        }

        console.log('[MediaClient] Initializing media Supabase client...');

        _mediaClient = createClient(MEDIA_SUPABASE_URL, MEDIA_SUPABASE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
                // Use a unique storage key to prevent conflicts
                storageKey: 'sb-media-auth-token',
                // Custom storage that does nothing (no persistence)
                storage: {
                    getItem: () => null,
                    setItem: () => { },
                    removeItem: () => { },
                }
            },
            // Identify this client in requests for debugging
            global: {
                headers: {
                    'x-client-info': 'sun-motors-media-client'
                }
            }
        });

        if (typeof window !== 'undefined') {
            window.__mediaSupabaseClient = _mediaClient;
        }
    }

    return _mediaClient;
};

// Legacy export for backwards compatibility (still works but now lazy loads)
// NOTE: This creates the client immediately when accessed, which is fine
// since it only happens when the module is actually imported by a page that needs it.
export const mediaSupabase = {
    get from() {
        return getMediaSupabase().from.bind(getMediaSupabase());
    },
    get storage() {
        return getMediaSupabase().storage;
    }
};

