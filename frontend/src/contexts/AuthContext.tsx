import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, OTPActionResponse, ResetPasswordResponse } from '../types';
import api from '../services/api';

// --- Types ---

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  registerSendOTP: (fullName: string, email: string, password: string) => Promise<OTPActionResponse>;
  registerVerifyOTP: (email: string, otp: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<OTPActionResponse>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<ResetPasswordResponse>;
  resendOTP: (email: string, purpose: 'register' | 'forgot_password') => Promise<OTPActionResponse>;
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

  // Direct login without OTP
  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });
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

  // Step 1: Send registration OTP
  const registerSendOTP = useCallback(
    async (fullName: string, email: string, password: string): Promise<OTPActionResponse> => {
      const { data } = await api.post<OTPActionResponse>('/api/auth/register/send-otp', {
        full_name: fullName,
        email,
        password,
      });
      return data;
    },
    []
  );

  // Step 2: Verify registration OTP & log in
  const registerVerifyOTP = useCallback(
    async (email: string, otp: string): Promise<void> => {
      const { data } = await api.post('/api/auth/register/verify-otp', {
        email,
        otp,
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

  // Legacy direct registration fallback
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

  // Request password reset OTP
  const forgotPassword = useCallback(
    async (email: string): Promise<OTPActionResponse> => {
      const { data } = await api.post<OTPActionResponse>('/api/auth/forgot-password', { email });
      return data;
    },
    []
  );

  // Submit reset OTP with new password
  const resetPassword = useCallback(
    async (email: string, otp: string, newPassword: string): Promise<ResetPasswordResponse> => {
      const { data } = await api.post<ResetPasswordResponse>('/api/auth/reset-password', {
        email,
        otp,
        new_password: newPassword,
      });
      return data;
    },
    []
  );

  // Resend OTP for either registration or forgot_password
  const resendOTP = useCallback(
    async (email: string, purpose: 'register' | 'forgot_password'): Promise<OTPActionResponse> => {
      const { data } = await api.post<OTPActionResponse>('/api/auth/resend-otp', {
        email,
        purpose,
      });
      return data;
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
        login,
        registerSendOTP,
        registerVerifyOTP,
        register,
        forgotPassword,
        resetPassword,
        resendOTP,
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
