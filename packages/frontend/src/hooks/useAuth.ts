import { useState } from 'react';

interface AuthState {
  token: string | null;
  userId: string | null;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    return { token, userId };
  });

  const login = (token: string, userId: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    setAuth({ token, userId });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setAuth({ token: null, userId: null });
  };

  return { ...auth, login, logout };
}
