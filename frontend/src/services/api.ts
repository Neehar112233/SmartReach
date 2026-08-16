import axios from 'axios';
import type { HealthResponse } from '../types';

// In development, Vite proxy handles /api -> backend
// In production, set VITE_API_BASE_URL to your backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor — attach auth token when available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartreach_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('smartreach_token');
      localStorage.removeItem('smartreach_user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- Health ---
export const checkHealth = async (): Promise<HealthResponse> => {
  const { data } = await api.get<HealthResponse>('/api/health');
  return data;
};

// --- Auth & Security ---
export const getCaptcha = async (): Promise<{ captcha_id: string; captcha_svg: string }> => {
  const { data } = await api.get<{ captcha_id: string; captcha_svg: string }>('/api/auth/captcha');
  return data;
};

export const resetPassword = async (payload: {
  email: string;
  captcha_id: string;
  captcha_code: string;
  new_password: string;
}): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>('/api/auth/reset-password', payload);
  return data;
};

export default api;

