'use client';

import { useState, useEffect } from 'react';
import { useAuth, useSubdomain } from '../contexts/AuthContext';
import LoginPage from '../components/LoginPage';
import Dashboard from '../components/Dashboard';
import LoadingSpinner from '../components/LoadingSpinner';
import InactiveSubdomainPage from '../components/InactiveSubdomainPage';
import SubdomainNotFoundPage from '../components/SubdomainNotFoundPage';

const SUBDOMAIN_STORAGE_KEY = 'llmc_subdomain_status';

interface PersistedSubdomainStatus {
  subdomain: string;
  exists: boolean;
  is_active: boolean;
  name?: string;
  description?: string;
  timestamp: number;
}

class SubdomainStorage {
  private static isClient = typeof window !== 'undefined';
  
  static saveSubdomainStatus(subdomain: string, status: any): void {
    if (!this.isClient) return;
    
    try {
      const subdomainStatus: PersistedSubdomainStatus = {
        subdomain,
        exists: status.exists,
        is_active: status.is_active,
        name: status.name,
        description: status.description,
        timestamp: Date.now()
      };
      sessionStorage.setItem(SUBDOMAIN_STORAGE_KEY, JSON.stringify(subdomainStatus));
    } catch (error) {
      console.error('[testing] SubdomainStorage.saveSubdomainStatus: Failed to save subdomain status:', error);
    }
  }
  
  static loadSubdomainStatus(currentSubdomain: string): PersistedSubdomainStatus | null {
    if (!this.isClient) {
      return null;
    }
    
    try {
      const stored = sessionStorage.getItem(SUBDOMAIN_STORAGE_KEY);
      if (!stored) {
        return null;
      }
      
      const subdomainStatus: PersistedSubdomainStatus = JSON.parse(stored);
      
      // Check if subdomain has changed
      if (subdomainStatus.subdomain !== currentSubdomain) {
        this.clearSubdomainStatus();
        return null;
      }
      
      // Check if status is too old (1 hour)
      const maxAge = 60 * 60 * 1000; // 1 hour
      const age = Date.now() - subdomainStatus.timestamp;
      if (age > maxAge) {
        this.clearSubdomainStatus();
        return null;
      }
      
      return subdomainStatus;
    } catch (error) {
      console.error('[DEBUG] SubdomainStorage: Failed to load subdomain status:', error);
      return null;
    }
  }
  
  static clearSubdomainStatus(): void {
    if (!this.isClient) {
      console.log('[DEBUG] SubdomainStorage: Not client side, skipping clear');
      return;
    }
    
    try {
      const beforeClear = sessionStorage.getItem(SUBDOMAIN_STORAGE_KEY);
      sessionStorage.removeItem(SUBDOMAIN_STORAGE_KEY);
    } catch (error) {
      console.error('[DEBUG] SubdomainStorage: Failed to clear subdomain status:', error);
    }
  }
}

interface SubdomainPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function Home({ searchParams }: SubdomainPageProps) {
  const { isAuthenticated, isLoading, user, error } = useAuth();
  const subdomain = useSubdomain();
  
  const [apiChecked, setApiChecked] = useState(false);
  const [subdomainExists, setSubdomainExists] = useState(false);
  const [subdomainActive, setSubdomainActive] = useState(false);
  const [subdomainName, setSubdomainName] = useState('');
  const [subdomainDescription, setSubdomainDescription] = useState('');

  // Check subdomain API when subdomain value is available
  useEffect(() => {
    async function checkSubdomainAPI() {
      
      // If no subdomain, don't check - wait for actual subdomain
      if (!subdomain || subdomain.trim() === '') {
        console.log('[DEBUG] No subdomain yet, waiting');
        return;
      }

      // If already checked, skip
      if (apiChecked) {
        console.log('[DEBUG] Already checked, skipping');
        return;
      }

      
      try {
        const response = await fetch(`/api/auth/subdomain/${subdomain}/status`);
        
        const data = await response.json();
        setApiChecked(true);
        setSubdomainExists(data.exists);
        setSubdomainActive(data.is_active);
        setSubdomainName(data.name || '');
        setSubdomainDescription(data.description || '');

        SubdomainStorage.saveSubdomainStatus(subdomain, data);
        
      } catch (error) {
        console.error('[DEBUG] API Error:', error);
        setApiChecked(true);
        setSubdomainExists(false);
      }
    }

    checkSubdomainAPI();
  }, [subdomain]);

  if (!apiChecked) {
    return <LoadingSpinner message="Checking subdomain..." fullScreen />;
  }

  if (apiChecked && !subdomainExists) {
    return <SubdomainNotFoundPage subdomain={subdomain} />;
  }

  // Show inactive page if subdomain exists but is inactive
  if (apiChecked && subdomainExists && !subdomainActive) {
    return (
      <InactiveSubdomainPage 
        subdomain={subdomain}
        name={subdomainName || 'Unknown Flow'}
        description={subdomainDescription}
      />
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Signing you in..." fullScreen />;
  }

  if (isAuthenticated && user) {
    return <Dashboard />;
  }

  return <LoginPage />;
}
