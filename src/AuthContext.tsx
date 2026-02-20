import { createContext, useContext, useState, type ReactNode } from 'react';

const AUTH_TOKEN_KEY = 'access_token';
const AUTH_REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_ROLE_KEY = 'role';
const AUTH_FULLNAME_KEY = 'fullName';
const AUTH_USER_TYPE_KEY = 'mi_app_user_type'; // Mantener por compatibilidad
const AUTH_USER_ID_KEY = 'mi_app_user_id';

interface AuthContextType {
  isAuthenticated: boolean;
  userType: string | null;
  userId: string | null;
  fullName: string | null;
  login: (token: string, callback?: () => void, userType?: string, userId?: string, refreshToken?: string, fullName?: string) => void;
  logout: (callback?: () => void) => void;
  updateToken: (newToken: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    return !!storedToken;
  });

  const [userType, setUserType] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_ROLE_KEY) || localStorage.getItem(AUTH_USER_TYPE_KEY);
  });

  const [userId, setUserId] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_USER_ID_KEY);
  });

  const [fullName, setFullName] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_FULLNAME_KEY) || localStorage.getItem('mi_app_user_name');
  });

  const login = (
    token: string, 
    callback?: () => void, 
    userTypeParam?: string, 
    userIdParam?: string,
    refreshToken?: string,
    fullNameParam?: string
  ) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem('mi_app_token', token); // Mantener por compatibilidad

    if (refreshToken) {
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
    }

    if (userTypeParam) {
      localStorage.setItem(AUTH_ROLE_KEY, userTypeParam);
      localStorage.setItem(AUTH_USER_TYPE_KEY, userTypeParam);
      setUserType(userTypeParam);
    }

    if (fullNameParam) {
      localStorage.setItem(AUTH_FULLNAME_KEY, fullNameParam);
      localStorage.setItem('mi_app_user_name', fullNameParam);
      setFullName(fullNameParam);
    }

    if (userIdParam) {
      localStorage.setItem(AUTH_USER_ID_KEY, userIdParam);
      setUserId(userIdParam);
    }

    setIsAuthenticated(true);
    if (callback) callback();
  };

  const updateToken = (newToken: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    localStorage.setItem('mi_app_token', newToken);
  };

  const logout = (callback?: () => void) => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_ROLE_KEY);
    localStorage.removeItem(AUTH_FULLNAME_KEY);
    localStorage.removeItem(AUTH_USER_TYPE_KEY);
    localStorage.removeItem(AUTH_USER_ID_KEY);
    localStorage.removeItem('mi_app_token');
    localStorage.removeItem('mi_app_user_name');
    localStorage.removeItem('mi_app_user_photo');
    setIsAuthenticated(false);
    setUserType(null);
    setUserId(null);
    setFullName(null);
    if (callback) callback();
  };

  const value = { isAuthenticated, userType, userId, fullName, login, logout, updateToken };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}