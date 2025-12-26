import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../services-apis/supabase/client';
import { buscarPerfilUsuario, criarOuAtualizarPerfilUsuario } from '../services-apis/supabase/perfilUsuarioService';

const AuthContext = createContext(null);

// Storage key for profile persistence
const PROFILE_STORAGE_KEY = 'sun_motors_user_profile';
const PROFILE_FETCH_TIMEOUT_MS = 8000;

// Helper: Extract cargo from JWT access token
const getCargoFromSession = (session) => {
    try {
        if (!session?.access_token) return null;
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        return payload.cargo || null;
    } catch (e) {
        console.warn('[AuthContext] Failed to extract cargo from JWT:', e);
        return null;
    }
};

// Helper: Save profile to localStorage
const saveProfileToStorage = (profile) => {
    if (profile) {
        try {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
        } catch (e) {
            console.warn('[AuthContext] Failed to save profile to storage:', e);
        }
    }
};

// Helper: Load profile from localStorage
const loadProfileFromStorage = () => {
    try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        console.warn('[AuthContext] Failed to load profile from storage:', e);
        return null;
    }
};

// Helper: Clear profile from localStorage
const clearProfileFromStorage = () => {
    try {
        localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch (e) {
        console.warn('[AuthContext] Failed to clear profile from storage:', e);
    }
};

// Helper: Timeout wrapper to avoid hanging fetches
const withTimeout = async (promise, timeoutMs) => {
    let timeoutHandle;
    const timeoutPromise = new Promise((resolve) => {
        timeoutHandle = setTimeout(() => resolve({ timedOut: true, data: null }), timeoutMs);
    });

    const result = await Promise.race([
        promise.then((data) => ({ timedOut: false, data })).catch((error) => {
            throw error;
        }),
        timeoutPromise
    ]);

    clearTimeout(timeoutHandle);
    return result;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // Refs to track state and prevent race conditions
    const heartbeatRef = useRef(null);
    const profileRef = useRef(profile);
    const initializedRef = useRef(false);

    // Keep profileRef in sync
    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const fetchProfile = async (currentUser, session = null) => {
        setProfileLoading(true);

        if (!currentUser) {
            setProfile(null);
            clearProfileFromStorage();
            setProfileLoading(false);
            return null;
        }

        // Extract cargo from JWT if available (priority source)
        const cargoFromJwt = session ? getCargoFromSession(session) : null;

        // Try to load from storage first for immediate availability
        const storedProfile = loadProfileFromStorage();
        if (storedProfile && storedProfile.id === currentUser.id) {
            const immediateProfile = cargoFromJwt
                ? { ...storedProfile, cargo: cargoFromJwt }
                : storedProfile;
            console.log('[AuthContext] Using stored profile:', immediateProfile.cargo);
            setProfile(immediateProfile);
            setProfileLoading(false);
            return immediateProfile;
        }

        try {
            console.log('[AuthContext] Fetching profile from database...');
            const { data, timedOut } = await withTimeout(buscarPerfilUsuario(currentUser.id), PROFILE_FETCH_TIMEOUT_MS);

            if (timedOut) {
                console.warn('[AuthContext] Profile fetch timed out, falling back to local profile');
            }

            if (data) {
                const finalProfile = {
                    ...data,
                    cargo: cargoFromJwt || data.cargo || 'ADM'
                };
                console.log('[AuthContext] Profile fetched:', finalProfile.cargo);
                setProfile(finalProfile);
                saveProfileToStorage(finalProfile);
                setProfileLoading(false);
                return finalProfile;
            }

            // Fallback: create or update profile using available data
            const derivedCargo = cargoFromJwt || 'ADM';
            const payload = {
                id: currentUser.id,
                nome: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuário',
                email: currentUser.email,
                cargo: derivedCargo
            };

            const createdProfile = await criarOuAtualizarPerfilUsuario(currentUser.id, payload);
            const finalProfile = createdProfile
                ? { ...createdProfile, cargo: cargoFromJwt || createdProfile.cargo || derivedCargo }
                : payload;

            console.warn('[AuthContext] Profile not in DB, using fallback cargo:', finalProfile.cargo);
            setProfile(finalProfile);
            saveProfileToStorage(finalProfile);
            setProfileLoading(false);
            return finalProfile;
        } catch (error) {
            console.error('[AuthContext] Error fetching profile:', error);
            setAuthError(error.message || 'Erro ao carregar perfil');

            // Use stored profile as fallback
            if (storedProfile && storedProfile.id === currentUser.id) {
                setProfile(storedProfile);
                setProfileLoading(false);
                return storedProfile;
            }

            // Ultimate fallback
            const ultimateFallback = {
                id: currentUser.id,
                nome: 'Usuário',
                cargo: cargoFromJwt || 'ADM'
            };
            setProfile(ultimateFallback);
            saveProfileToStorage(ultimateFallback);
            setProfileLoading(false);
            return ultimateFallback;
        } finally {
            setProfileLoading(false);
        }
    };

    // Start session heartbeat
    const startSessionHeartbeat = () => {
        if (heartbeatRef.current) return;

        console.log('[AuthContext] Starting session heartbeat');
        heartbeatRef.current = setInterval(async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error || !session) return;

                // Check if token expires soon (within 5 minutes)
                const expiresAt = session.expires_at;
                const now = Math.floor(Date.now() / 1000);
                const timeUntilExpiry = expiresAt - now;

                if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
                    console.log('[AuthContext] Token expiring soon, refreshing...');
                    await supabase.auth.refreshSession();
                }
            } catch (error) {
                console.error('[AuthContext] Heartbeat error:', error);
            }
        }, 4 * 60 * 1000); // Every 4 minutes
    };

    // Stop heartbeat
    const stopSessionHeartbeat = () => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    };

    useEffect(() => {
        let mounted = true;

        // Initialize: First check session directly, then set up listener
        const initializeAuth = async () => {
            console.log('[AuthContext] Initializing...');

            try {
                // Get current session from Supabase
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('[AuthContext] Session check error:', error);
                    setAuthError(error.message);
                    setLoading(false);
                    return;
                }

                const currentUser = session?.user ?? null;
                console.log('[AuthContext] Initial session:', currentUser ? `User: ${currentUser.email}` : 'No user');

                if (mounted) {
                    setUser(currentUser);

                    if (currentUser) {
                        await fetchProfile(currentUser, session);
                        startSessionHeartbeat();
                    } else {
                        setProfile(null);
                        clearProfileFromStorage();
                    }

                    initializedRef.current = true;
                    setLoading(false);
                    setProfileLoading(false);
                }
            } catch (error) {
                console.error('[AuthContext] Init error:', error);
                if (mounted) {
                    setLoading(false);
                    setProfileLoading(false);
                }
            }
        };

        // Initialize first
        initializeAuth();

        // Then set up auth state listener for future changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            // Skip INITIAL_SESSION since we handle it in initializeAuth
            if (event === 'INITIAL_SESSION') {
                console.log('[AuthContext] INITIAL_SESSION event (handled by init)');
                return;
            }

            console.log('[AuthContext] Auth event:', event, session ? 'has session' : 'no session');
            const currentUser = session?.user ?? null;

            switch (event) {
                case 'SIGNED_IN':
                    console.log('[AuthContext] User signed in');
                    setUser(currentUser);
                    if (currentUser) {
                        await fetchProfile(currentUser, session);
                        startSessionHeartbeat();
                    }
                    setLoading(false);
                    setProfileLoading(false);
                    break;

                case 'SIGNED_OUT':
                    console.log('[AuthContext] User signed out');
                    setUser(null);
                    setProfile(null);
                    clearProfileFromStorage();
                    setAuthError(null);
                    stopSessionHeartbeat();
                    setLoading(false);
                    setProfileLoading(false);
                    break;

                case 'TOKEN_REFRESHED':
                    console.log('[AuthContext] Token refreshed');
                    setUser(currentUser);
                    // Update cargo from JWT if changed
                    if (currentUser && profileRef.current) {
                        const cargoFromJwt = getCargoFromSession(session);
                        if (cargoFromJwt && cargoFromJwt !== profileRef.current.cargo) {
                            const updatedProfile = { ...profileRef.current, cargo: cargoFromJwt };
                            setProfile(updatedProfile);
                            saveProfileToStorage(updatedProfile);
                        }
                    }
                    break;

                case 'USER_UPDATED':
                    console.log('[AuthContext] User updated');
                    setUser(currentUser);
                    if (currentUser) {
                        await fetchProfile(currentUser, session);
                    }
                    setProfileLoading(false);
                    break;

                default:
                    console.log('[AuthContext] Other event:', event);
                    setUser(currentUser);
                    if (!currentUser) {
                        setProfile(null);
                        clearProfileFromStorage();
                    }
                    setProfileLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
            stopSessionHeartbeat();
        };
    }, []);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const signup = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setProfile(null);
    };

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) throw error;
    };

    const value = {
        user,
        profile,
        loading,
        profileLoading,
        authError,
        login,
        signup,
        logout,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
