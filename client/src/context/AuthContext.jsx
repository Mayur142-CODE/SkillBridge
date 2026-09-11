import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Check existing session on application start
   */
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Session restore error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Authenticate user with email and password
   */
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Pending account notification handling
        if (data.status === 'pending') {
          return {
            success: false,
            status: 'pending',
            role: data.role,
            message: data.message,
          };
        }

        const msg = data.message || 'Login failed. Please check your credentials.';
        setAuthError(msg);
        return { success: false, message: msg };
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const msg = 'Network error. Please try again.';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  };

  /**
   * Register a new stakeholder account
   */
  const register = async (role, formData) => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...formData, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || 'Registration failed. Please check your inputs.';
        setAuthError(msg);
        return { success: false, message: msg };
      }

      return {
        success: true,
        status: data.status || 'pending',
        message: data.message,
        user: data.user,
      };
    } catch (err) {
      const msg = 'Network error. Please try again.';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  };

  /**
   * Log out current user
   */
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAuthError(null);
    }
  };

  const value = {
    user,
    isAuthenticated: Boolean(user),
    loading,
    authError,
    setAuthError,
    login,
    register,
    logout,
    refreshUser: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
