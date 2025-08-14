'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  profile_picture?: string;
  last_login_at?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (subdomain: string, redirectPath?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const API_BASE = '/api/auth';

const AUTH_STORAGE_KEY = 'llmc_auth_state';

interface PersistedAuthState {
  user: User | null;
  isAuthenticated: boolean;
  timestamp: number;
}

class AuthStorage {
  private static isClient = typeof window !== 'undefined';
  
  static saveAuthState(user: User | null, isAuthenticated: boolean): void {
    if (!this.isClient) return;
    
    try {
      const authState: PersistedAuthState = {
        user,
        isAuthenticated,
        timestamp: Date.now()
      };
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
    } catch (error) {
      console.error('[testing] AuthStorage.saveAuthState: Failed to save auth state:', error);
    }
  }
  
  static loadAuthState(): PersistedAuthState | null {
    if (!this.isClient) return null;
    
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      
      const authState: PersistedAuthState = JSON.parse(stored);
      
      // Check if auth state is too old (1 hour)
      const maxAge = 60 * 60 * 1000; // 1 hour
      if (Date.now() - authState.timestamp > maxAge) {
        this.clearAuthState();
        return null;
      }
      
      return authState;
    } catch (error) {
      console.error('[testing] AuthStorage.loadAuthState: Failed to load auth state:', error);
      return null;
    }
  }
  
  static clearAuthState(): void {
    if (!this.isClient) return;
    
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('[testing] AuthStorage.clearAuthState: Failed to clear auth state:', error);
    }
  }
}

export class AuthAPI {
  static generateOAuthUrl(subdomain: string): string {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const oauthBaseUrl = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_URL;
    
    // Use explicit OAuth redirect URI if provided, otherwise fall back to current domain
    const redirectUri = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || `${baseUrl}/auth/callback`;
    
    if (typeof window !== 'undefined') {
      console.log('[DEBUG] Using fixed redirect URI instead of current origin for OAuth compliance');
      console.log('[DEBUG AUTH] Environment variables:');
      console.log('[DEBUG AUTH] - NEXT_PUBLIC_BASE_URL:', baseUrl);
      console.log('[DEBUG AUTH] - NEXT_PUBLIC_OAUTH_REDIRECT_URI:', process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI);
      console.log('[DEBUG AUTH] - NEXT_PUBLIC_GOOGLE_CLIENT_ID:', clientId);
      console.log('[DEBUG AUTH] - NEXT_PUBLIC_GOOGLE_OAUTH_URL:', oauthBaseUrl);
      console.log('[DEBUG AUTH] - Generated redirect URI:', redirectUri);
      console.log('[DEBUG AUTH] - Subdomain:', subdomain);
    }
    
    const scope = 'openid email profile';
    const state = `subdomain:${subdomain}`;
    
    const oauthUrl = `${oauthBaseUrl}?` +
      `client_id=${encodeURIComponent(clientId || '')}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${encodeURIComponent(state)}&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    if (typeof window !== 'undefined') {
      console.log('[DEBUG AUTH] - Generated OAuth URL:', oauthUrl);
    }
    
    // Additional validation
    if (!clientId) {
      console.error('[ERROR] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set!');
    }
    if (!baseUrl) {
      console.error('[ERROR] NEXT_PUBLIC_BASE_URL is not set!');
    }
    if (!oauthBaseUrl) {
      console.error('[ERROR] NEXT_PUBLIC_GOOGLE_OAUTH_URL is not set!');
    }
    
    return oauthUrl;
  }


  static async getCurrentUser(): Promise<User | null> {
    
    const response = await fetch(`${API_BASE}/me`, {
      method: 'GET',
      credentials: 'include', 
    });
    
    
    if (response.status === 401) {
      console.log('[testing] AuthAPI.getCurrentUser: User not authenticated (401)');
      return null;
    }
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[testing] AuthAPI.getCurrentUser: Request failed with error:', error);
      throw new Error(`Failed to get user: ${error}`);
    }
    
    const user = await response.json();
    return user;
  }

  static async logout(): Promise<void> {
    
    const response = await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include', 
    });
    
    
    if (!response.ok) {
      console.warn('[testing] AuthAPI.logout: Logout request failed, but continuing');
    } else {
      console.log('[testing] AuthAPI.logout: Logout successful');
    }
  }
}

// OAuth popup handler
export class OAuthPopupHandler {
  private popup: Window | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  async openOAuthPopup(oauthUrl: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      
      // Validate OAuth URL format
      const expectedOAuthUrl = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_URL;
      if (!expectedOAuthUrl || !oauthUrl.startsWith(expectedOAuthUrl)) {
        console.error('[testing] OAuthPopup.openOAuthPopup: Invalid OAuth URL format:', oauthUrl);
        reject(new Error('Invalid OAuth URL format'));
        return;
      }
      
      this.popup = window.open(
        oauthUrl,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!this.popup) {
        reject(new Error('Failed to open popup. Please allow popups for this site.'));
        return;
      }

      const messageListener = async (event: MessageEvent) => {
        
        if (event.data?.type === 'AUTH_SUCCESS') {
          if (event.data.sessionToken) {
            try {
              const response = await fetch('/api/auth/set-cookie', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionToken: event.data.sessionToken }),
              });
              
              if (response.ok) {
                console.log('[testing] OAuthPopup.messageListener: Session cookie set successfully');
              } else {
                console.error('[testing] OAuthPopup.messageListener: Failed to set cookie:', await response.text());
              }
            } catch (error) {
              console.error('[testing] OAuthPopup.messageListener: Error calling set-cookie API:', error);
            }
          }
          
          this.cleanup();
          window.removeEventListener('message', messageListener);
          resolve(true);
        } else if (event.data?.type === 'POPUP_CLOSED') {
          this.cleanup();
          window.removeEventListener('message', messageListener);
          resolve(true); 
        } else if (event.data?.type === 'AUTH_ERROR') {
          console.error('[testing] OAuthPopup.messageListener: Authentication error:', event.data.message);
          this.cleanup();
          window.removeEventListener('message', messageListener);
          reject(new Error(event.data.message || 'Authentication failed'));
        }
      };
      window.addEventListener('message', messageListener);

      setTimeout(() => {
        this.cleanup();
        window.removeEventListener('message', messageListener);
        reject(new Error('Authentication timeout'));
      }, 300000); 
    });
  }

  private cleanup() {
    if (this.popup) {
      this.popup.close();
      this.popup = null;
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initializeAuthState = (): AuthState => {
    const persistedAuth = AuthStorage.loadAuthState();
    if (persistedAuth) {
      return {
        isAuthenticated: persistedAuth.isAuthenticated,
        user: persistedAuth.user,
        isLoading: false,
        error: null,
      };
    } else {
      return {
        isAuthenticated: false,
        user: null,
        isLoading: true, 
        error: null,
      };
    }
  };

  const [state, setState] = useState<AuthState>(initializeAuthState());


  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const setLoading = (isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  };

  const setError = (error: string) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  };

  const setUser = (user: User | null) => {
    
    const isAuthenticated = !!user;
    
    // Save auth state to storage
    AuthStorage.saveAuthState(user, isAuthenticated);
    
    setState(prev => {
      const newState = {
        ...prev,
        user,
        isAuthenticated,
        isLoading: false,
        error: null,
      };
      return newState;
    });
  };

  // Check authentication status
  const checkAuth = async () => {
    try {
      setLoading(true);
      const user = await AuthAPI.getCurrentUser();
      setUser(user);
    } catch (error) {
      setUser(null);
    }
  };

  // Login function
  const login = async (subdomain: string, redirectPath?: string): Promise<boolean> => {
    try {
      setLoading(true);
      clearError();

      const oauthUrl = AuthAPI.generateOAuthUrl(subdomain);

      const popupHandler = new OAuthPopupHandler();
      const authCompleted = await popupHandler.openOAuthPopup(oauthUrl);

      const user = await AuthAPI.getCurrentUser();
      
      if (user) {
        setUser(user);
        
        if (redirectPath) {
          window.location.href = redirectPath;
        }
      } else {
        throw new Error('Authentication failed - no user found after SSR processing');
      }

      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      return false;
    }
  };

  const logout = async () => {
    
    AuthStorage.clearAuthState();
    
    try {
      AuthAPI.logout();
    } catch (error) {
      console.error('[testing] AuthProvider.logout: Logout API failed:', error);
    }
    
    window.location.href = '/';
  };

  useEffect(() => {
    const persistedAuth = AuthStorage.loadAuthState();
    if (!persistedAuth) {
      checkAuth();
    } else {
      console.log('[testing] AuthProvider: Using persisted auth state, skipping API check');
    }
  }, []);

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    checkAuth,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useSubdomain(): string {
  const [subdomain, setSubdomain] = useState<string>('');

  useEffect(() => {
    const hostname = window.location.hostname;
    let extractedSubdomain = '';
    
    const devDomain = process.env.NEXT_PUBLIC_DEV_DOMAIN;
    const prodDomain = process.env.NEXT_PUBLIC_PROD_DOMAIN;
    
    if (devDomain && hostname.includes(devDomain)) {
      extractedSubdomain = hostname.split(devDomain)[0];
    } else if (prodDomain && hostname.includes(prodDomain)) {
      extractedSubdomain = hostname.split(prodDomain)[0];
    } else {
      console.log('[testing] useSubdomain: No valid subdomain pattern found');
    }
    
    setSubdomain(extractedSubdomain);
  }, []);

  return subdomain;
}