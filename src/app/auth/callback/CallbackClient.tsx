'use client';

import { useEffect } from 'react';

interface CallbackClientProps {
  status: 'success' | 'error';
  message: string;
  subdomain?: string;
}

export default function CallbackClient({ status, message, subdomain }: CallbackClientProps) {
  useEffect(() => {

    if (status === 'success') {
      if (window.opener) {
        window.opener.postMessage({
          type: 'AUTH_SUCCESS',
          message: 'Authentication successful',
          subdomain: subdomain
        }, '*');
      }
      
      setTimeout(() => {
        if (window.opener) {
          window.opener.postMessage({
            type: 'POPUP_CLOSED'
          }, '*');
        }
        
        window.close();
      }, 1500);
      
    } else if (status === 'error') {
      if (window.opener) {
        window.opener.postMessage({
          type: 'AUTH_ERROR',
          message: message
        }, '*');
      }
      
      setTimeout(() => {
        window.close();
      }, 3000);
    }

    const handleBeforeUnload = () => {
      if (window.opener) {
        window.opener.postMessage({
          type: 'POPUP_CLOSED'
        }, '*');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [status, message, subdomain]);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return (
          <div className="flex items-center justify-center h-12 w-12 bg-green-100 rounded-full mx-auto">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center justify-center h-12 w-12 bg-red-100 rounded-full mx-auto">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="mb-4">
          {getStatusIcon()}
        </div>
        
        <h1 className={`text-xl font-semibold mb-4 ${getStatusColor()}`}>
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Authentication Failed'}
        </h1>
        
        <p className="text-gray-600 text-sm">
          {message}
        </p>
        
        {status === 'error' && (
          <p className="text-gray-500 text-xs mt-4">
            This popup will close automatically in a few seconds.
          </p>
        )}
        
        {status === 'success' && (
          <p className="text-gray-500 text-xs mt-4">
            Popup will close automatically...
          </p>
        )}
      </div>
    </div>
  );
}