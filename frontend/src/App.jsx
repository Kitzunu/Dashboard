import React, { useState, useEffect, createContext, useContext } from 'react';
import Login from './components/Login.jsx';
import Layout from './components/Layout.jsx';
import { api } from './api.js';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function App() {
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('ac_auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Basic expiry check — JWT exp is in seconds
        const payload = JSON.parse(atob(parsed.token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setAuth(parsed);
        } else {
          localStorage.removeItem('ac_auth');
        }
      } catch {
        localStorage.removeItem('ac_auth');
      }
    }
  }, []);

  const login = (authData) => {
    setAuth(authData);
    localStorage.setItem('ac_auth', JSON.stringify(authData));
  };

  const logout = (reason = 'manual') => {
    // Call logout API before clearing localStorage so the token is still available
    api.logout(reason).catch(() => {});
    setAuth(null);
    localStorage.removeItem('ac_auth');
  };

  useEffect(() => {
    const handle = () => {
      setAuth(null);
      localStorage.removeItem('ac_auth');
    };
    window.addEventListener('auth-expired', handle);
    return () => window.removeEventListener('auth-expired', handle);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {auth ? <Layout /> : <Login />}
    </AuthContext.Provider>
  );
}
