'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useSubdomain } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

interface FlowItem {
  id: string;
  flow_id: string;
  name: string;
  description: string | null;
  access_type: string;
  is_active: boolean;
  has_access: boolean;
  updated_at: string;
}

interface DashboardData {
  subdomain: string;
  name: string;
  description: string | null;
  flows: FlowItem[];
}

interface DashboardStats {
  totalFlows: number;
  activeFlows: number;
  publicFlows: number;
  restrictedFlows: number;
  accessibleFlows: number;
  recentlyUpdated: number;
}

export default function Dashboard() {
  const { user, logout, isLoading } = useAuth();
  const subdomain = useSubdomain();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate dashboard stats
  const calculateStats = (flows: FlowItem[]): DashboardStats => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      totalFlows: flows.length,
      activeFlows: flows.filter(f => f.is_active).length,
      publicFlows: flows.filter(f => f.access_type === 'public').length,
      restrictedFlows: flows.filter(f => f.access_type === 'restricted').length,
      accessibleFlows: flows.filter(f => f.has_access).length,
      recentlyUpdated: flows.filter(f => new Date(f.updated_at) > oneWeekAgo).length,
    };
  };

  // Load dashboard data
  useEffect(() => {
    async function loadDashboardData() {
      
      if (!subdomain) {
        console.log('[testing] Dashboard: No subdomain yet, waiting...');
        return;
      }

      try {
        
        const response = await fetch(`/api/auth/subdomain/${subdomain}/dashboard`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.detail || 'Failed to load dashboard data');
        }
        
        setDashboardData(data);
        
      } catch (error) {
        console.error('[testing] Dashboard: Error loading dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load flows');
      } finally {
        setLoadingFlows(false);
      }
    }

    loadDashboardData();
    
    const timeoutId = setTimeout(() => {
      if (!subdomain) {
        setError('No subdomain detected');
        setLoadingFlows(false);
      }
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [subdomain]);

  const handleLogout = async () => {
    try {
      await logout();
      console.log('[testing] Dashboard.handleLogout: Logout completed successfully');
    } catch (error) {
      console.error('[testing] Dashboard.handleLogout: Logout error:', error);
    }
  };

  const handleFlowClick = (flowId: string, isActive: boolean, hasAccess: boolean) => {
    
    // Only allow navigation if flow is active and user has access
    if (!isActive || !hasAccess) {
      console.log('[testing] Dashboard: Flow click blocked - inactive or no access');
      return;
    }
    
    router.push(`/dashboard/${flowId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(dateString);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <CardContent className="text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-muted-foreground border-t-transparent"></div>
            <p className="text-foreground font-medium">Loading your workspace...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboardData ? calculateStats(dashboardData.flows) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {subdomain}
                </h1>
                <p className="text-sm text-muted-foreground">Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <div className="flex items-center space-x-3">
                    {user.profile_picture && (
                      <img
                        src={user.profile_picture}
                        alt={user.name}
                        className="h-8 w-8 rounded-full ring-2 ring-border"
                      />
                    )}
                    <div className="hidden md:block text-sm">
                      <p className="font-medium text-foreground">{user.name}</p>
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

      {/* Main content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4">
          
          {/* Loading State */}
          {loadingFlows && (
            <Card className="p-8">
              <CardContent className="text-center space-y-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-muted-foreground border-t-transparent"></div>
                <div>
                  <p className="text-foreground font-medium">Loading your flows...</p>
                  <p className="text-muted-foreground text-sm mt-2">This may take a moment</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-destructive rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-destructive-foreground" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">Error Loading Flows</h3>
                    <p className="text-muted-foreground">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dashboard Content */}
          {!loadingFlows && !error && dashboardData && (
            <div className="space-y-6">
              {/* Flows Section */}
              <div className="space-y-4">
                <div className="flex items-center"><h2 className="text-lg font-semibold text-foreground">All Flows</h2><Badge className="ml-4 text-xs" variant="secondary">
                    {dashboardData.flows.length} total • {dashboardData.flows.filter(flow => flow.is_active && flow.has_access).length} active
                  </Badge></div>

                {/* Flows Grid */}
                {dashboardData.flows.length === 0 ? (
                  <Card className="p-12 text-center border-dashed">
                    <CardContent>
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">No flows found</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        There are no flows configured for this subdomain yet.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="divide-y divide-border rounded-lg border bg-card">
                    {dashboardData.flows.map((flow) => {
                      const canAccess = flow.is_active && flow.has_access;
                      const isDisabled = !flow.is_active || !flow.has_access;
                      
                      return (
                        <div
                          key={flow.id}
                          className={cn(
                            "flex items-center px-4 py-4 group transition-colors duration-150",
                            canAccess 
                              ? "hover:bg-muted cursor-pointer" 
                              : "opacity-60 cursor-not-allowed"
                          )}
                          onClick={() => handleFlowClick(flow.id, flow.is_active, flow.has_access)}
                          style={{ minHeight: 72 }}
                          title={
                            !flow.is_active 
                              ? "This flow is inactive" 
                              : !flow.has_access 
                                ? "You don't have access to this flow"
                                : "Click to open this flow"
                          }
                        >
                        {/* Flow icon */}
                        <div className="flex-shrink-0 mr-4">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            canAccess ? "bg-primary/10" : "bg-muted/50"
                          )}>
                            <svg className={cn(
                              "w-5 h-5",
                              canAccess ? "text-primary" : "text-muted-foreground"
                            )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        </div>
                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={cn(
                              "font-semibold text-base",
                              canAccess 
                                ? "text-foreground group-hover:text-primary" 
                                : "text-muted-foreground"
                            )}>
                              {flow.name}
                            </span>
                            {!flow.is_active && (
                              <Badge variant="secondary" className="text-xs px-2 py-0 bg-muted text-muted-foreground">
                                Inactive
                              </Badge>
                            )}
                            {flow.is_active && !flow.has_access && (
                              <Badge variant="outline" className="text-xs px-2 py-0 border-amber-300 text-amber-700 bg-amber-50">
                                No Access
                              </Badge>
                            )}
                          </div>
                          {flow.description && !flow.description.startsWith('Published flow:') && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {flow.description}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {getTimeAgo(flow.updated_at)}
                          </div>
                        </div>
                        {/* Open button */}
                        <div className="ml-4 flex items-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                              "h-8 px-3",
                              canAccess 
                                ? "text-primary hover:text-primary/80"
                                : "text-muted-foreground cursor-not-allowed opacity-50"
                            )}
                            tabIndex={-1}
                            disabled={!canAccess}
                            onClick={e => { 
                              e.stopPropagation(); 
                              handleFlowClick(flow.id, flow.is_active, flow.has_access); 
                            }}
                          >
                            <span className="text-sm">
                              {canAccess ? "Open" : "Disabled"}
                            </span>
                            {canAccess && (
                              <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </Button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}