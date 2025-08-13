'use client';

import { useState, useEffect } from 'react';
import { useAuth, useSubdomain } from '../../../contexts/AuthContext';
import FlowPage from '../../../components/FlowPage';
import NotAuthenticatedPage from '../../../components/NotAuthenticatedPage';
import LoadingSpinner from '../../../components/LoadingSpinner';

interface FlowPageProps {
  params: Promise<{
    flowId: string;
  }>;
}

export default function Flow({ params }: FlowPageProps) {
  const { isAuthenticated, isLoading, user, checkAuth } = useAuth();
  const subdomain = useSubdomain();
  const [flowId, setFlowId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Extract flowId from params
  useEffect(() => {
    params.then(({ flowId }) => setFlowId(flowId));
  }, [params]);

  // Check auth only once when subdomain is ready and we haven't checked yet
  useEffect(() => {
    if (subdomain && !authChecked && !isAuthenticated && !user) {
      checkAuth();
      setAuthChecked(true);
    }
  }, [subdomain, authChecked, isAuthenticated, user, checkAuth]);

  // Show loading while extracting flowId or checking auth
  if (!flowId || isLoading) {
    return <LoadingSpinner message="Loading flow..." fullScreen />;
  }

  // Show flow page if authenticated
  if (isAuthenticated && user) {
    return <FlowPage flowId={flowId} />;
  }

  // Show authentication required page for unauthenticated users
  return (
    <NotAuthenticatedPage 
      message="You need to sign in to access this flow"
      redirectPath={`/dashboard/${flowId}`}
    />
  );
}