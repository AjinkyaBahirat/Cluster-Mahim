import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          setToken(storedToken);
        } catch (err) {
          console.error('Failed to restore session', err);
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (phone, password, role, rememberMe) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { phone, password, role, rememberMe });
      const { token: newToken, user: newUser } = res.data;

      if (rememberMe) {
        localStorage.setItem('token', newToken);
        localStorage.removeItem('token_session'); // Clear old session storage fallback if any
      } else {
        sessionStorage.setItem('token', newToken);
        localStorage.removeItem('token'); // Clear persistent storage
      }

      setUser(newUser);
      setToken(newToken);
      setLoading(false);
      return newUser;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setUser(null);
    setToken(null);
    navigate('/login');
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
