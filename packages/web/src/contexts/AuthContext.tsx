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
  isNativeAuth: boolean;
  login: (credential: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ID_TOKEN_KEY = 'photoscout_id_token';
const USER_KEY = 'photoscout_user';
const NATIVE_AUTH_KEY = 'photoscout_native_auth';

// Check for native auth from URL params or window object
function getNativeAuth(): User | null {
  // Check URL params first (passed from iOS app)
  const params = new URLSearchParams(window.location.search);
  const isNative = params.get('nativeAuth') === 'true';
  
  if (isNative) {
    const userId = params.get('userId');
    const userName = params.get('userName');
    const userEmail = params.get('userEmail');
    const userPhoto = params.get('userPhoto');
    
    if (userId) {
      return {
        userId,
        email: userEmail || '',
        name: userName || '',
        picture: userPhoto || undefined,
      };
    }
  }
  
  // Check window.nativeAuth (injected by iOS WebView)
  if ((window as any).nativeAuth?.userId) {
    const nativeAuth = (window as any).nativeAuth;
    return {
      userId: nativeAuth.userId,
      email: nativeAuth.userEmail || '',
      name: nativeAuth.userName || '',
      picture: nativeAuth.userPhoto || undefined,
    };
  }
  
  // Check localStorage for previously stored native auth
  const stored = localStorage.getItem(NATIVE_AUTH_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(NATIVE_AUTH_KEY);
    }
  }
  
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNativeAuth, setIsNativeAuth] = useState(false);

  // Load stored auth on mount
  useEffect(() => {
    // First check for native auth (from iOS app)
    const nativeUser = getNativeAuth();
    if (nativeUser) {
      setUser(nativeUser);
      setIsNativeAuth(true);
      // Store native auth for persistence
      localStorage.setItem(NATIVE_AUTH_KEY, JSON.stringify(nativeUser));
      setIsLoading(false);
      return;
    }
    
    // Fall back to web auth (JWT token)
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
  
  // Listen for native auth injection after page load
  useEffect(() => {
    const handleNativeAuth = (event: CustomEvent) => {
      const nativeAuth = event.detail;
      if (nativeAuth?.userId) {
        const nativeUser: User = {
          userId: nativeAuth.userId,
          email: nativeAuth.userEmail || '',
          name: nativeAuth.userName || '',
          picture: nativeAuth.userPhoto || undefined,
        };
        setUser(nativeUser);
        setIsNativeAuth(true);
        localStorage.setItem(NATIVE_AUTH_KEY, JSON.stringify(nativeUser));
      }
    };
    
    window.addEventListener('nativeAuthReady', handleNativeAuth as EventListener);
    return () => window.removeEventListener('nativeAuthReady', handleNativeAuth as EventListener);
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
    setIsNativeAuth(false);
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(NATIVE_AUTH_KEY);

    // Clear conversation ID to start fresh
    localStorage.removeItem('photoscout_conversation_id');
  };

  return (
    <AuthContext.Provider value={{ user, idToken, isLoading, isNativeAuth, login, logout }}>
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
