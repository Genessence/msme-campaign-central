import { useState, useEffect, createContext, useContext } from 'react';
import fastApiClient from '@/lib/fastapi-client';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth token and validate it
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const userData = await fastApiClient.auth.getCurrentUser();
          setUser(userData);
        } catch (error) {
          // Invalid token, remove it
          localStorage.removeItem('authToken');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await fastApiClient.auth.login(email, password);
      
      // Get user data after successful login
      const userData = await fastApiClient.auth.getCurrentUser();
      setUser(userData);
      
      return { error: null };
    } catch (error) {
      console.error('Authentication error:', error);
      let errorMessage = 'Login failed';
      
      if (error instanceof Error) {
        if (error.message.includes('Unable to connect') || error.message.includes('Backend server')) {
          errorMessage = 'Cannot connect to server. Please ensure the backend is running on http://127.0.0.1:8001';
        } else if (error.message.includes('Incorrect email or password')) {
          errorMessage = 'Invalid email or password';
        } else {
          errorMessage = error.message;
        }
      }
      
      return { error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      await fastApiClient.auth.register({
        email,
        password,
        full_name: fullName,
      });
      
      return { error: null };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Registration failed' } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    fastApiClient.auth.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}