import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('avenqra_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('avenqra_token');
      const storedUser = localStorage.getItem('avenqra_user');
      
      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch (err) {
          console.error('Failed to parse stored user:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token: authToken } = response.data.data;
      
      localStorage.setItem('avenqra_token', authToken);
      localStorage.setItem('avenqra_user', JSON.stringify(userData));
      
      setToken(authToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Login failed. Please check credentials.';
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('avenqra_token');
    localStorage.removeItem('avenqra_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
