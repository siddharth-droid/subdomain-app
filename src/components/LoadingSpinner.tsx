'use client';

import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const containerClasses = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-background relative overflow-hidden'
    : 'flex items-center justify-center p-8';

  return (
    <div className={cn(containerClasses, className)}>
      {/* Gradient mesh background for fullscreen loading */}
      {fullScreen && (
        <>
          <div className="fixed inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-mesh-primary animate-gradient-mesh-1 opacity-40" />
            <div className="absolute inset-0 bg-gradient-mesh-secondary animate-gradient-mesh-2 opacity-30" />
            <div className="absolute inset-0 bg-gradient-mesh-accent animate-gradient-mesh-3 opacity-20" />
          </div>
          <div className="fixed inset-0 -z-5 particle-field opacity-30" />
        </>
      )}
      
      <div className="text-center relative z-10">
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-primary/60 border-t-transparent mx-auto mb-4 shadow-lg",
            sizeClasses[size]
          )}
          style={{
            background: fullScreen ? 'conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.2), transparent)' : undefined
          }}
        ></div>
        <p className="text-foreground text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}