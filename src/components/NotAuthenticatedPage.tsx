'use client';

import { useAuth, useSubdomain } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import BackgroundGradient from './BackgroundGradient';

interface NotAuthenticatedPageProps {
  message?: string;
  redirectPath?: string;
}

export default function NotAuthenticatedPage({ 
  message = "You need to sign in to access this page",
  redirectPath 
}: NotAuthenticatedPageProps) {
  const { login, isLoading } = useAuth();
  const subdomain = useSubdomain();

  const handleSignIn = async () => {
    if (!subdomain) {
      console.error('[testing] NotAuthenticatedPage: No subdomain available for login');
      return;
    }
    
    try {
      await login(subdomain, redirectPath);
    } catch (error) {
      console.error('[testing] NotAuthenticatedPage: Sign in failed:', error);
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundGradient />

      <div className="relative w-full max-w-md">
        <Card className="glass-enhanced shadow-2xl shadow-primary/5 border-border/20">
          <CardHeader className="text-center space-y-6 pt-8">
            {/* LLM Controls Logo to match Login page */}
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20">
                <img src="/LLMCLogo.svg" alt="LLM Controls logo" className="h-8 w-8" />
              </div>
            </div>

          <div className="space-y-4">
            <CardTitle className="text-3xl font-bold tracking-tight">
              Authentication Required
            </CardTitle>
            
            <CardDescription className="text-base">
              {message}
            </CardDescription>
          </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Button
                onClick={handleSignIn}
                disabled={isLoading}
                size="lg"
                className="w-full px-8 py-4 text-base font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 bg-primary hover:bg-primary/90 backdrop-blur-sm border border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                loading={isLoading}
              >
                {isLoading ? (
                  'Signing In...'
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In to Continue
                  </>
                )}
              </Button>

              <Button
                onClick={handleGoHome}
                variant="outline"
                size="lg"
                className="w-full hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go to Homepage
              </Button>
            </div>

            <p className="text-muted-foreground text-sm text-center">
              You&apos;ll be redirected back here after signing in.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}