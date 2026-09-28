import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ResellerSettings } from '../types';
import { apiRequest, setStoredToken, clearStoredToken } from '../lib/api';

interface Persona {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'reseller' | 'customer';
  full_name: string;
  company: string;
  balance: number;
  brand_name?: string;
}

interface AuthContextType {
  user: User | null;
  whiteLabel: ResellerSettings | null;
  loading: boolean;
  personas: Persona[];
  login: (username: string, password?: string) => Promise<void>;
  switchRole: (role: 'admin' | 'reseller' | 'customer', userId?: number) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateWhiteLabel: (settings: Partial<ResellerSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [whiteLabel, setWhiteLabel] = useState<ResellerSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [personas, setPersonas] = useState<Persona[]>([]);

  const fetchPersonas = async () => {
    try {
      const data = await apiRequest<Persona[]>('/api/auth/personas');
      setPersonas(data);
    } catch (err) {
      console.error('Failed to load personas:', err);
    }
  };

  const refreshUser = async () => {
    try {
      const data = await apiRequest<{ user: User; whiteLabel: ResellerSettings | null }>('/api/auth/me');
      setUser(data.user);
      setWhiteLabel(data.whiteLabel);
    } catch {
      // Auto fallback switch to admin persona for seamless demo
      await switchRole('admin');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchPersonas();
      await refreshUser();
      setLoading(false);
    };
    init();
  }, []);

  const login = async (username: string, password: string = 'Cloudpro123!') => {
    setLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: User; whiteLabel: ResellerSettings | null }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      setStoredToken(data.token);
      setUser(data.user);
      setWhiteLabel(data.whiteLabel);
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (role: 'admin' | 'reseller' | 'customer', userId?: number) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: User; whiteLabel: ResellerSettings | null }>('/api/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({ targetRole: role, userId })
      });
      setStoredToken(data.token);
      setUser(data.user);
      setWhiteLabel(data.whiteLabel);
    } catch (err) {
      console.error('Failed to switch role:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearStoredToken();
    switchRole('admin');
  };

  const updateWhiteLabel = async (settings: Partial<ResellerSettings>) => {
    const updated = await apiRequest<{ success: boolean; brand_name: string }>('/api/whitelabel', {
      method: 'PUT',
      body: JSON.stringify({
        ...settings,
        user_id: user?.role === 'reseller' ? user.id : (user?.reseller_id || 2)
      })
    });
    if (updated.success) {
      setWhiteLabel((prev) => prev ? { ...prev, ...settings } : null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        whiteLabel,
        loading,
        personas,
        login,
        switchRole,
        logout,
        refreshUser,
        updateWhiteLabel
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
