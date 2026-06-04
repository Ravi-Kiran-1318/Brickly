import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { setAuthToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  // On app load — restore session from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('buildr_token');
    const storedUser  = JSON.parse(localStorage.getItem('buildr_user') || 'null');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      // Set token for our API instance
      setAuthToken(storedToken);
    }
    setReady(true);
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
