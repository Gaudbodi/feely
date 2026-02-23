import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // In a real app, verify token or fetch user profile
      setUser({ email: 'user@example.com' }); // Mock user for now
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await axios.post(`${API_URL}/token`, formData);
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);
    setUser({ email });
    return access_token;
  };

  const signup = async (email, password) => {
    const response = await axios.post(`${API_URL}/api/auth/signup`, { email, password });
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);
    setUser({ email });
    return access_token;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
