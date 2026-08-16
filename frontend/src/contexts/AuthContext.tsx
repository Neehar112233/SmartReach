import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import api from '../services/api';

// --- Types ---

export interface InitiateLoginResult {
  require_otp: boolean;
  email: string;
  message: string;
  dev_otp?: string;
}

export interface GenericAuthResult {
  message: string;
  email?: string;
  dev_otp?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  initiateLogin: (email: string, password: string) => Promise<InitiateLoginResult>;
  verifyLoginOTP: (email: string, otp: string) => Promise<void>;
  resendOTP: (email: string, purpose?: string) => Promise<GenericAuthResult>;
  forgotPassword: (email: string) => Promise<GenericAuthResult>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<GenericAuthResult>;
  login: (email: string, password: string) => Promise<InitiateLoginResult>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

// --- Context ---

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'smartreach_token';
const USER_KEY = 'smartreach_user';

// --- Provider ---

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setState((s) => ({ ...s, isLoading: false }));
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const persistSession = (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const initiateLogin = useCallback(async (email: string, password: string): Promise<InitiateLoginResult> => {
    const { data } = await api.post('/api/auth/login', { email, password });
    return data;
  }, []);

  const verifyLoginOTP = useCallback(async (email: string, otp: string): Promise<void> => {
    const { data } = await api.post('/api/auth/verify-login-otp', { email, otp });
    const user: User = {
      id: data.user.id,
      fullName: data.user.full_name,
      email: data.user.email,
      resumeUploaded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persistSession(data.access_token, user);
  }, []);

  const resendOTP = useCallback(async (email: string, purpose: string = 'login'): Promise<GenericAuthResult> => {
    const { data } = await api.post('/api/auth/resend-otp', { email, purpose });
    return data;
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<GenericAuthResult> => {
    const { data } = await api.post('/api/auth/forgot-password', { email });
    return data;
  }, []);

  const resetPassword = useCallback(async (email: string, otp: string, newPassword: string): Promise<GenericAuthResult> => {
    const { data } = await api.post('/api/auth/reset-password', {
      email,
      otp,
      new_password: newPassword,
    });
    return data;
  }, []);

  const login = initiateLogin;

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      const { data } = await api.post('/api/auth/register', {
        full_name: fullName,
        email,
        password,
      });
      const user: User = {
        id: data.user.id,
        fullName: data.user.full_name,
        email: data.user.email,
        resumeUploaded: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persistSession(data.access_token, user);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const updateUser = useCallback((user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState((s) => ({ ...s, user }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        initiateLogin,
        verifyLoginOTP,
        resendOTP,
        forgotPassword,
        resetPassword,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// --- Hook ---

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
