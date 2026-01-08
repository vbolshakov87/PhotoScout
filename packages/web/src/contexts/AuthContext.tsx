import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
  userId: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  idToken: string | null;
  isLoading: boolean;
  login: (credential: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ID_TOKEN_KEY = 'photoscout_id_token';
const USER_KEY = 'photoscout_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(ID_TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        // Check if token is expired
        const decoded: any = jwtDecode(storedToken);
        const now = Date.now() / 1000;

        if (decoded.exp && decoded.exp > now) {
          setIdToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          // Token expired, clear storage
          localStorage.removeItem(ID_TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      } catch (error) {
        console.error('Error loading stored auth:', error);
        localStorage.removeItem(ID_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  const login = (credential: string) => {
    try {
      const decoded: any = jwtDecode(credential);

      const user: User = {
        userId: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };

      setUser(user);
      setIdToken(credential);

      // Store in localStorage
      localStorage.setItem(ID_TOKEN_KEY, credential);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error decoding credential:', error);
    }
  };

  const logout = () => {
    setUser(null);
    setIdToken(null);
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // Clear conversation ID to start fresh
    localStorage.removeItem('photoscout_conversation_id');
  };

  return (
    <AuthContext.Provider value={{ user, idToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
