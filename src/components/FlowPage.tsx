'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useSubdomain } from '../contexts/AuthContext';
import FlowExecutionInterface from './FlowExecutionInterface';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

interface FlowPageProps {
  flowId: string;
}

export default function FlowPage({ flowId }: FlowPageProps) {
  const { user, logout, isLoading } = useAuth();
  const subdomain = useSubdomain();
  const router = useRouter();
  const [flowData, setFlowData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFlowData() {
      if (!subdomain || !flowId) {
        console.log('[testing] FlowPage: No subdomain or flowId yet, waiting...');
        return;
      }

      try {
        
        // Get dashboard data to find this flow
        const response = await fetch(`/api/auth/subdomain/${subdomain}/dashboard`);
        const dashboardData = await response.json();
        
        if (!response.ok) {
          throw new Error(dashboardData.detail || 'Failed to load flow data');
        }
        
        // Find the specific flow by ID
        const flow = dashboardData.flows.find((f: any) => f.id === flowId);
        
        if (!flow) {
          throw new Error(`Flow with ID ${flowId} not found`);
        }
        
        setFlowData(flow);
        
      } catch (error) {
        console.error('[testing] FlowPage: Error loading flow data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load flow');
      } finally {
        setLoading(false);
      }
    }

    loadFlowData();
  }, [subdomain, flowId]);

  const handleLogout = async () => {
    
    try {
      await logout();
    } catch (error) {
      console.error('[testing] FlowPage.handleLogout: Logout error:', error);
    }
  };

  const goBackToDashboard = () => {
    router.push('/');
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground border-t-transparent"></div>
              <div className="text-center">
                <p className="text-foreground font-medium">Loading flow...</p>
                <p className="text-muted-foreground text-sm mt-1">Preparing your experience</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Header - improved for clarity and hierarchy */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <Button
                onClick={goBackToDashboard}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground rounded-full p-2"
                aria-label="Back to Dashboard"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold text-foreground leading-tight">
                  {flowData?.name || `Flow ${flowId}`}
                </span>
                {subdomain && (
                  <span className="text-xs text-muted-foreground font-medium mt-0.5">{subdomain}</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-6">
              {user && (
                <>
                  <div className="flex items-center space-x-3">
                    {user.profile_picture && (
                      <img
                        src={user.profile_picture}
                        alt={user.name}
                        className="h-10 w-10 rounded-full ring-2 ring-border"
                      />
                    )}
                    <div className="hidden md:block text-sm">
                      <p className="font-semibold text-foreground">{user.name}</p>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content - form at the top, no published flow section */}
      <div className="relative z-10 container mx-auto py-8 px-4">
        {error ? (
          <Card className="max-w-lg mx-auto bg-card/50 backdrop-blur-xl border-border/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-destructive">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Flow Not Available</span>
              </CardTitle>
              <CardDescription>
                {error === `Flow with ID ${flowId} not found` ? 
                  "This flow doesn't exist or you don't have access to it." : 
                  error
                }
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-8 max-w-2xl mx-auto">
            <FlowExecutionInterface 
              flowId={flowId}
              flowName={flowData?.name || `Flow ${flowId}`}
              subdomain={subdomain || ''}
              actualFlowId={flowData?.flow_id}
            />
          </div>
        )}
      </div>
    </div>
  );
}