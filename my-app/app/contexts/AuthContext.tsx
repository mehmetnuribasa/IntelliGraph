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

      const response = await fetch('/api/auth/login', {
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
      
      const newUser: User = {
        id: userData.id,
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
      const requestData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        title: '', // Optional field
        bio: `${role} at ${institution}` // Optional field
      };
      
      console.log('Sending registration data:', { ...requestData, password: '[HIDDEN]' });
      
      const response = await fetch('/api/academics/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        console.error('Registration error response:', errorData);
        
        // If there are detailed validation errors, show them
        if (errorData.errors) {
          const errorMessages = Object.entries(errorData.errors)
            .map(([field, messages]: [string, any]) => `${field}: ${messages.join(', ')}`)
            .join('\n');
          throw new Error(`Validation errors:\n${errorMessages}`);
        }
        
        // Show detailed server error if available
        const errorMessage = errorData.error ? 
          `${errorData.message}\nDetails: ${errorData.error}` : 
          errorData.message;
          
        throw new Error(errorMessage || 'Registration failed');
      }

      const userData = await response.json();
      
      const newUser: User = {
        id: userData.id || Math.random().toString(36).substr(2, 9),
        email,
        name,
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