'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'academic' | 'institution';
  institution: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: 'academic' | 'institution') => Promise<void>;
  register: (name: string, email: string, password: string, role: 'academic' | 'institution', institution: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: 'academic' | 'institution') => {
    setIsLoading(true);
    
    try {
      // Handle demo logins
      if (email === 'demo' && password === 'demo') {
        const demoUser = (window as any).demoLogin;
        if (demoUser) {
          setUser(demoUser);
          localStorage.setItem('user', JSON.stringify(demoUser));
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch('/api/academics/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const { user: userData } = await response.json();
      
      console.log('Login successful, user data:', userData);
      
      const newUser: User = {
        id: userData.id || userData.userId, // Fallback to userId for backward compatibility
        email: userData.email,
        name: userData.name,
        role: userData.role,
        institution: userData.institution || userData.name
      };

      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: 'academic' | 'institution', institution: string) => {
    setIsLoading(true);
    
    try {
      // For now, just create a local user without backend registration
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role,
        institution
      };

      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
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