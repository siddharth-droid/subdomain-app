'use client';

import { useState, useEffect } from 'react';
import { useAuth, useSubdomain } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
// import { cn } from '../lib/utils';
import BackgroundGradient from './BackgroundGradient';

export default function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();
  const subdomain = useSubdomain();
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const [subdomainChecked, setSubdomainChecked] = useState(false);

  useEffect(() => {
    setSubdomainChecked(true);
  }, [subdomain]);

  const handleLogin = async () => {
    if (!subdomain) {
      console.error('[testing] LoginPage.handleLogin: No subdomain detected');
      alert('Subdomain not detected. Please ensure you are on a valid subdomain.');
      return;
    }

    setIsLoginInProgress(true);
    clearError();

    try {
      const success = await login(subdomain);
      
      if (success) {
        console.log('[testing] LoginPage.handleLogin: Login successful, user will be redirected to dashboard');
      } else {
        console.log('[testing] LoginPage.handleLogin: Login failed but no error thrown');
      }
    } catch (error) {
      console.error('[testing] LoginPage.handleLogin: Error type:', typeof error);
      if (error instanceof Error) {
        console.error('[testing] LoginPage.handleLogin: Error message:', error.message);
      }
    } finally {
      console.log('[testing] LoginPage.handleLogin: Setting login in progress to false');
      setIsLoginInProgress(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundGradient />
      
      
      <div className="relative w-full max-w-md">
        <Card className="glass-enhanced shadow-2xl shadow-primary/5 border-border/20">
          <CardHeader className="text-center space-y-8 pt-8">
            {/* LLM Controls Logo with enhanced styling */}
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20">
                <img src="/LLMCLogo.svg" alt="LLM Controls logo" className="h-8 w-8" />
              </div>
            </div>
            {/* Header with improved typography */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Access your dashboard
              </h1>
              <p className="text-muted-foreground text-sm">
                Sign in with your Google account to continue
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 flex flex-col justify-center items-center gap-6">
                         {/* Error display with enhanced styling */}
              {error && (
               <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg mx-auto min-w-[260px] max-w-[340px] w-auto flex flex-col items-center backdrop-blur-sm" style={{minWidth: 'min(100%, 340px)'}}>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-destructive mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-destructive text-sm flex-1 font-medium">Authentication failed, try again.</p>
                </div>
                <Button
                  onClick={clearError}
                  variant="outline"
                  size="sm"
                  className="mt-3 backdrop-blur-sm"
                >
                  Dismiss
                </Button>
              </div>
            )}
            {/* Login button - match width to header */}
            <div className="flex flex-col items-center w-full">
              <Button
                onClick={handleLogin}
                disabled={isLoading || isLoginInProgress || !subdomain}
                size="lg"
                className="mx-auto min-w-[260px] max-w-[340px] w-auto px-8 py-4 text-base font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 bg-primary hover:bg-primary/90 backdrop-blur-sm border border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                style={{minWidth: 'min(100%, 340px)'}}
                loading={isLoading || isLoginInProgress}
              >
                {isLoading || isLoginInProgress ? (
                  'Signing you in...'
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>
            {/* Subdomain error with enhanced styling */}
            {subdomainChecked && !subdomain && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg w-full backdrop-blur-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-yellow-600 text-sm">
                    Unable to detect subdomain. Please ensure you&apos;re on a valid subdomain URL.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <div className="pb-6 pt-2 text-center border-t border-border/30">
            <p className="text-xs text-muted-foreground font-medium">© 2025 LLM Controls</p>
          </div>
        </Card>
      </div>
    </div>
  );
}