'use client';

interface SubdomainNotFoundPageProps {
  subdomain: string;
}

export default function SubdomainNotFoundPage({ subdomain }: SubdomainNotFoundPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Subdomain Not Found
        </h1>
        
        <p className="text-gray-600">
          The subdomain <span className="font-mono">{subdomain}{process.env.NEXT_PUBLIC_PROD_DOMAIN}</span> does not exist.
        </p>
      </div>
    </div>
  );
}