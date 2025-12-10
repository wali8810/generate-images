import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserState } from '../types';
import { DAILY_CREDITS, API_URL } from '../constants';
import { getOrCreateDeviceId } from '../utils/fingerprint';
import { websocketService } from '../services/websocket';

interface User {
    id: number;
    email: string;
    credits: number;
    role: 'user' | 'admin';
    name?: string;
    subscription_status?: string;
}

interface AuthContextType {
    user: UserState; // App state (Visitor or DB User)
    dbUser: User | null; // The actual DB user
    loading: boolean;
    isAdmin: boolean;
    isUserBlocked: boolean; // Helper to check if user is blocked
    deviceId: string | null; // Device fingerprint for visitors
    deviceCreditsRemaining: number; // Credits remaining for this device
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => void;
    decrementCredit: () => void;
    checkDeviceCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'estampa_magica_user_v2';
const STORAGE_KEY_TOKEN = 'estampa_magica_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dbUser, setDbUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [appUser, setAppUser] = useState<UserState | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [deviceCreditsRemaining, setDeviceCreditsRemaining] = useState(3);

    // Load App User (Credits/Local State)
    const loadAppUser = () => {
        const today = new Date().toISOString().split('T')[0];
        const stored = localStorage.getItem(STORAGE_KEY_USER);

        let currentUser: UserState;

        if (stored) {
            const parsedUser = JSON.parse(stored);
            // Reset daily credits for VISITORS ONLY
            if (!dbUser && parsedUser.lastResetDate !== today) {
                currentUser = {
                    ...parsedUser,
                    credits: 3,
                    lastResetDate: today
                };
            } else {
                currentUser = parsedUser;
            }
        } else {
            currentUser = {
                name: 'Visitante',
                credits: 3, // Visitor starts with 3
                isPremium: false,
                totalGenerated: 0,
                lastResetDate: today
            };
        }

        if (dbUser) {
            currentUser = {
                ...currentUser,
                name: dbUser.name || dbUser.email.split('@')[0],
                credits: dbUser.role === 'admin' ? 999999 : dbUser.credits,
                isPremium: dbUser.role === 'admin'
            };
        }

        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
        setAppUser(currentUser);
    };

    // Check for existing token on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem(STORAGE_KEY_TOKEN);
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/api/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setDbUser(data.user);
                    } else {
                        localStorage.removeItem(STORAGE_KEY_TOKEN);
                    }
                } catch (error) {
                    console.error("Auth check failed", error);
                    localStorage.removeItem(STORAGE_KEY_TOKEN);
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    // Sync App User when DB User changes
    useEffect(() => {
        loadAppUser();
    }, [dbUser]);

    // WebSocket Connection Management
    useEffect(() => {
        const token = localStorage.getItem(STORAGE_KEY_TOKEN);

        // Connect to WebSocket
        websocketService.connect(token || undefined);

        // Subscribe to credit updates
        const handleCreditUpdate = (data: { userId: number; credits: number; timestamp: number }) => {
            console.log('💳 Credit update received:', data);

            if (dbUser && dbUser.id === data.userId) {
                // Update dbUser credits
                setDbUser(prev => prev ? { ...prev, credits: data.credits } : null);
            }
        };

        // Subscribe to user data updates
        const handleUserUpdate = (data: { userId: number; user: any; timestamp: number }) => {
            console.log('👤 User update received:', data);

            if (dbUser && dbUser.id === data.userId) {
                // Update dbUser with new data
                setDbUser(data.user);
            }
        };

        websocketService.on('creditUpdate', handleCreditUpdate);
        websocketService.on('userUpdate', handleUserUpdate);

        // Cleanup on unmount
        return () => {
            websocketService.off('creditUpdate', handleCreditUpdate);
            websocketService.off('userUpdate', handleUserUpdate);
        };
    }, [dbUser]);

    const login = async (email: string, password: string) => {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();
        localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
        setDbUser(data.user);

        // Update WebSocket authentication
        websocketService.updateAuth(data.token);
    };

    const register = async (email: string, password: string) => {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }

        const data = await response.json();
        localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
        setDbUser(data.user);

        // Update WebSocket authentication
        websocketService.updateAuth(data.token);
    };

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        setDbUser(null);

        // Disconnect WebSocket
        websocketService.disconnect();

        // Reset app user to visitor
        const today = new Date().toISOString().split('T')[0];
        const visitorUser = {
            name: 'Visitante',
            credits: 3,
            isPremium: false,
            totalGenerated: 0,
            lastResetDate: today
        };
        setAppUser(visitorUser);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(visitorUser));

        // Reconnect as anonymous
        websocketService.connect();
    };

    const refreshUser = async () => {
        if (dbUser) {
            try {
                const token = localStorage.getItem(STORAGE_KEY_TOKEN);
                const response = await fetch(`${API_URL}/api/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setDbUser(data.user);
                }
            } catch (e) {
                console.error("Failed to refresh user", e);
            }
        } else {
            loadAppUser();
        }
    };

    const decrementCredit = () => {
        if (!appUser) return;

        // Admin never loses credits
        if (dbUser?.role === 'admin') return;

        // Optimistic UI update - the backend will handle actual deduction
        // and send WebSocket update which will sync the real value
        const updatedUser = {
            ...appUser,
            credits: Math.max(0, appUser.credits - 1),
            totalGenerated: appUser.totalGenerated + 1
        };

        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
        setAppUser(updatedUser);

        // For logged-in users, backend handles deduction in /api/generate
        // For visitors, backend handles device credits
        // WebSocket will sync the real value back to us
    };

    // Check Device Credits - Verificar créditos do dispositivo
    const checkDeviceCredits = async () => {
        try {
            const id = await getOrCreateDeviceId();
            setDeviceId(id);

            const response = await fetch(`${API_URL}/api/check-device`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId: id })
            });

            if (response.ok) {
                const data = await response.json();
                setDeviceCreditsRemaining(data.creditsRemaining);
            }
        } catch (error) {
            console.error('Error checking device credits:', error);
        }
    };

    // Check device credits on mount (for visitors)
    useEffect(() => {
        if (!dbUser) {
            checkDeviceCredits();
        }
    }, [dbUser]);

    return (
        <AuthContext.Provider value={{
            user: appUser!,
            dbUser,
            loading,
            isAdmin: dbUser?.role === 'admin',
            isUserBlocked: dbUser?.role !== 'admin' && (
                dbUser?.subscription_status === 'cancelled' ||
                dbUser?.subscription_status === 'inactive' ||
                dbUser?.subscription_status === 'pending' ||
                dbUser?.subscription_status === 'overdue'
            ),
            deviceId,
            deviceCreditsRemaining,
            login,
            register,
            logout,
            refreshUser,
            decrementCredit,
            checkDeviceCredits
        }}>
            {!loading && appUser && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
