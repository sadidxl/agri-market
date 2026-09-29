import React, { createContext, useContext, useState, useEffect } from 'react';
import * as AuthService from '@/services/AuthService';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: if a token is stored, verify it against the backend so a
  // stale/expired token doesn't leave the UI stuck in a logged-in state.
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await AuthService.getCurrentUser();
        if (response.success) {
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        }
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await AuthService.login({ email, password });
      if (response.success && response.data) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        return response.data.user;
      }
      throw new Error(response.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data) => {
    setIsLoading(true);
    try {
      const response = await AuthService.register(data);
      if (response.success && response.data) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        return response.data.user;
      }
      throw new Error(response.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch {
      // ignore — logging out client-side still succeeds even if the request fails
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const response = await AuthService.getCurrentUser();
    if (response.success) {
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, refreshUser, isAuthenticated: !!user, isLoading }}
    >
      {children}
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
