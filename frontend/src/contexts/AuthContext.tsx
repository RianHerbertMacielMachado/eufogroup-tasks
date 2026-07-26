import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import api from '../services/api';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setAccessToken(token);
      try {
        const parsed = JSON.parse(storedUser);
        // Garante que cities sempre existe como array (compatibilidade com sessões antigas)
        if (parsed && !Array.isArray(parsed.cities)) {
          parsed.cities = [];
        }
        setUser(parsed);
      } catch {}
    }
    setIsLoading(false);
  }, []);

  const login = async (discordId: string, password: string) => {
    const { data } = await api.post('/auth/login', { discordId, password });
    const { accessToken: token, refreshToken, user: userData } = data.data;
    
    // Garante que cities sempre existe como array
    if (!Array.isArray(userData.cities)) userData.cities = [];
    
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    setAccessToken(token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setAccessToken(null);
  };

  const refreshAuth = async () => {
    try {
      const { data } = await api.get('/auth/me');
      const updatedUser = data.data;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
