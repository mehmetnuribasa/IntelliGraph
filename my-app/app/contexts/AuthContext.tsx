'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api'; // Axios instance'ımızı import ediyoruz
import { useRouter } from 'next/navigation';
import { jwtDecode } from "jwt-decode"; // Token çözümleme kütüphanesi

// Backend'deki User şemasıyla uyumlu tip tanımlaması
export interface User {
  userId: string;
  email: string;
  name: string;
  role: string; // 'ACADEMIC', 'FUNDING_MANAGER', 'ADMIN'
}

// Token içeriğinin (Payload) tipi
interface DecodedToken {
  userId: string;
  email: string;
  name: string;
  role: string;
  exp: number; // Token bitiş süresi (Unix timestamp)
  iat: number; // Token oluşturulma süresi
  [key: string]: any; // Ekstra alanlar olabilir
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, title?: string, bio?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 1. Sayfa Yüklendiğinde: Token'dan Kullanıcıyı Oku
  useEffect(() => {
    const initializeAuth = () => {
      const accessToken = localStorage.getItem('accessToken');

      if (accessToken) {
        try {
          // Token'ı çöz
          const decoded: DecodedToken = jwtDecode(accessToken);
          
          // Süresi dolmuş mu kontrol et (Opsiyonel ama iyi pratiktir)
          const currentTime = Date.now() / 1000;
          if (decoded.exp < currentTime) {
             // Süresi dolmuşsa çıkış yap
             logout();
             return;
          }

          // User state'ini token verisiyle doldur
          setUser({
            userId: decoded.userId,
            email: decoded.email,
            name: decoded.name, // Backend token'a 'name' eklediyse buradan gelir
            role: decoded.role,
          });

        } catch (error) {
          console.error("Token decode error:", error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // 2. LOGIN İŞLEMİ
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Backend API'ye istek at
      const response = await api.post('/academics/login', {
        email,
        password
      });

      const { accessToken, refreshToken } = response.data;

      // Tokenları kaydet
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Token'dan kullanıcı bilgisini anında çöz ve state'e at
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
  const register = async (name: string, email: string, password: string, title?: string, bio?: string) => {
    setIsLoading(true);
    try {
      await api.post('/academics/register', {
        name,
        email,
        password,
        title,
        bio
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
  const logout = () => {
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user'); // Eski yöntemden kalan çöp varsa temizle
    
    router.push('/');
    router.refresh(); 
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
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