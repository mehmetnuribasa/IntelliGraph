'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { jwtDecode } from "jwt-decode";
import { useRouter } from 'next/navigation';

// User Type from backend
export interface User {
  userId: string;
  email: string;
  name: string;
  role: string; // 'ACADEMIC', 'FUNDING_MANAGER', 'ADMIN'
  title?: string;
}

// Decoded Token Interface
interface DecodedToken {
  userId: string;
  email: string;
  name: string;
  role: string;
  exp: number; // Token finish time
  iat: number; // Token creation time
  [key: string]: any; // Additional fields may exist
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, title?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Function to fetch fresh user data from API
  const refreshUser = async () => {
    try {
      const response = await api.get('/academics/profile');
      setUser(response.data);
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  // Read token from localStorage on initial load
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');

      if (accessToken) {
        try {
          // Decode token to get user info immediately
          const decoded: DecodedToken = jwtDecode(accessToken);
          
          // Fill user state with token data first (for speed)
          setUser({
            userId: decoded.userId,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
          });

          // Then fetch the latest data from the server
          await refreshUser();

        } catch (error) {
          console.error("Token decode error:", error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // LOGIN PROCESS
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/academics/login', {
        email,
        password
      });

      const { accessToken } = response.data;

      // Save access token to localStorage (Refresh token is in HttpOnly Cookie)
      localStorage.setItem('accessToken', accessToken);
      
      // Decode token to get user info and set state
      const decoded: DecodedToken = jwtDecode(accessToken);
      
      setUser({
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
      });

      // İsteğe bağlı: Yönlendirme
      // router.push('/dashboard'); 

    } catch (error: any) {
      console.error('Login error:', error.response?.data?.message || error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 3. REGISTER İŞLEMİ
  const register = async (name: string, email: string, password: string, title?: string) => {
    setIsLoading(true);
    try {
      await api.post('/academics/register', {
        name,
        email,
        password,
        title
      });
      
      // Başarılı olursa login sayfasına yönlendirme veya otomatik giriş yapılabilir
    } catch (error: any) {
      console.error('Registration error:', error.response?.data?.message || error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 4. LOGOUT İŞLEMİ
  const logout = async () => {
    try {
      // Call backend to clear cookie and remove session from DB
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear client-side state regardless of backend success
      setUser(null);
      localStorage.removeItem('accessToken');
      
      router.push('/');
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}