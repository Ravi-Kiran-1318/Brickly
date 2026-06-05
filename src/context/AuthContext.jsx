import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api, { setAuthToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  // On app load — restore session from localStorage and verify it
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('buildr_token');
      const storedUser = JSON.parse(localStorage.getItem('buildr_user') || 'null');

      if (storedToken && storedUser) {
        try {
          // Temporarily set token to verify session
          setAuthToken(storedToken);
          const userId = storedUser.id || storedUser._id;

          // Make API call to fetch fresh profile
          const res = await api.get(`/api/auth/profile/${userId}`);

          if (res.data) {
            setToken(storedToken);
            setUser(res.data);
            localStorage.setItem('buildr_user', JSON.stringify(res.data));
          } else {
            throw new Error('User not found on server');
          }
        } catch (err) {
          console.warn('Session verification failed, clearing auth details:', err.message);
          localStorage.removeItem('buildr_token');
          localStorage.removeItem('buildr_user');
          setAuthToken(null);
          setToken(null);
          setUser(null);
        }
      }
      setReady(true);
    };

    verifySession();
  }, []);

  // Call this after successful login or register
  const login = (tokenVal, userVal) => {
    localStorage.setItem('buildr_token', tokenVal);
    localStorage.setItem('buildr_user', JSON.stringify(userVal));
    setAuthToken(tokenVal);
    setToken(tokenVal);
    setUser(userVal);
  };

  // Call this on logout
  const logout = () => {
    localStorage.removeItem('buildr_token');
    localStorage.removeItem('buildr_user');
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  // Update user in context + localStorage (e.g. after phone verify)
  const updateUser = (updatedFields) => {
    const updated = { ...user, ...updatedFields };
    localStorage.setItem('buildr_user', JSON.stringify(updated));
    setUser(updated);
  };

  // Don't render children until localStorage check is complete
  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — use this in any component
export const useAuth = () => useContext(AuthContext);
