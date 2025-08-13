'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import BackgroundGradient from './BackgroundGradient';

interface InactiveSubdomainPageProps {
  subdomain: string;
  name: string;
  description?: string;
}

export default function InactiveSubdomainPage({ subdomain, name, description }: InactiveSubdomainPageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundGradient />

      <div className="relative w-full max-w-md">
        <Card className="glass-enhanced shadow-2xl shadow-primary/5 border-border/20">
          <CardHeader className="text-center space-y-6 pt-8">
            {/* Status Icon */}
            <div className="w-16 h-16 bg-muted/20 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div className="space-y-4">
              <CardTitle className="text-3xl font-bold tracking-tight">
                Service Temporarily Unavailable
              </CardTitle>
              
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></div>
                <span className="text-foreground text-sm font-medium">{subdomain}</span>
              </div>
              
              <CardDescription className="text-lg">
                This workspace is currently under maintenance
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Flow Details */}
            <div className="bg-muted/30 border rounded-lg p-6">
              <div className="flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-lg font-semibold text-foreground">Flow Details</h3>
              </div>
              
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Name:</span>
                  <span className="text-foreground font-medium">{name}</span>
                </div>
                
                {description && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground text-sm mr-4">Description:</span>
                    <span className="text-muted-foreground text-sm text-right flex-1">{description}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Status:</span>
                  <span className="inline-flex items-center px-2 py-1 bg-primary/10 border border-primary/20 rounded-full">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mr-1.5"></div>
                    <span className="text-foreground text-xs font-medium">Maintenance</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Information Message */}
            <div className="bg-muted/30 border rounded-lg p-6">
              <div className="flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-muted-foreground mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-foreground font-semibold text-sm">What&apos;s happening?</h4>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This flow is temporarily disabled for maintenance or updates. Please check back later or contact your administrator for more information.
              </p>
            </div>

            {/* Contact Information */}
            <div className="pt-6 border-t border-border">
              <div className="flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-muted-foreground mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-foreground font-semibold text-sm">Need Assistance?</span>
              </div>
              <p className="text-muted-foreground text-sm text-center">
                Contact your administrator for immediate access or updates on service restoration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}