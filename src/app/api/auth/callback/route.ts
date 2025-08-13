import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    return new Response(createErrorHTML(`Authentication failed: ${errorDescription || error}`), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Check for authorization code
  if (!code || !state) {
    return new Response(createErrorHTML('Missing authorization code or state'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    // Extract subdomain from state
    const stateMatch = state.match(/subdomain:([^:]+)/);
    const subdomain = stateMatch ? stateMatch[1] : null;

    if (!subdomain) {
      return new Response(createErrorHTML('Invalid state parameter'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }


    const backendUrl = process.env.LLMC_BACKEND_URL;
    const backendResponse = await fetch(`${backendUrl}/api/v1/auth/subdomain/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, subdomain }),
    });


    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[testing] API Route: Backend error:', errorText);
      return new Response(createErrorHTML('Authentication failed on server'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    let sessionToken = '';
    const setCookieHeader = backendResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      const cookieMatch = setCookieHeader.match(/subdomain_session=([^;]+)/);
      if (cookieMatch) {
        sessionToken = cookieMatch[1];
      }
    }

    return new Response(createSuccessHTML(subdomain, sessionToken), {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    return new Response(createErrorHTML('An unexpected error occurred'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

function createSuccessHTML(subdomain: string, sessionToken: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Successful</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f9fafb; }
        .container { text-align: center; max-width: 400px; padding: 2rem; }
        .spinner { border: 4px solid #f3f4f6; border-top: 4px solid #4f46e5; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        h1 { color: #111827; margin-bottom: 0.5rem; }
        p { color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Authentication Successful!</h1>
        <div class="spinner"></div>
        <p>Closing popup...</p>
      </div>
      <script>
        console.log('[testing] Success HTML: Notifying parent and closing popup');
        console.log('[testing] Success HTML: Session token length:', '${sessionToken}'.length);
        console.log('[testing] Success HTML: Window opener exists:', !!window.opener);
        
        // Check if this is popup mode or direct redirect
        if (window.opener) {
          console.log('[testing] Success HTML: Popup mode detected - sending message to parent');
          const message = { 
            type: 'AUTH_SUCCESS', 
            subdomain: '${subdomain}',
            sessionToken: '${sessionToken}'
          };
          console.log('[testing] Success HTML: Message payload:', message);
          window.opener.postMessage(message, '*');
          console.log('[testing] Success HTML: Message sent to parent, closing popup');
          
          // Close popup after brief delay
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          console.log('[testing] Success HTML: Direct redirect mode detected - setting cookie and redirecting');
          
          // Set cookie via API call, then redirect to dashboard
          fetch('/api/auth/set-cookie', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionToken: '${sessionToken}' }),
          }).then(response => {
            console.log('[testing] Success HTML: Cookie set response:', response.status);
            if (response.ok) {
              console.log('[testing] Success HTML: Cookie set successfully, redirecting to subdomain dashboard');
              // Redirect to the original subdomain where user started OAuth flow
              const baseUrl = '${process.env.NEXT_PUBLIC_BASE_URL}' || 'http://localhost:3000';
              const devDomain = '${process.env.NEXT_PUBLIC_DEV_DOMAIN}' || '.localhost';
              const prodDomain = '${process.env.NEXT_PUBLIC_PROD_DOMAIN}' || '.llmcontrols.ai';
              
              // Determine which domain to use based on current environment
              const isLocalhost = baseUrl.includes('localhost');
              const domain = isLocalhost ? devDomain.substring(1) : prodDomain.substring(1); // Remove leading dot
              const protocol = baseUrl.startsWith('https') ? 'https' : 'http';
              const port = isLocalhost ? ':3000' : '';
              
              const subdomainUrl = \`\${protocol}://\${subdomain}.\${domain}\${port}/\`;
              console.log('[testing] Success HTML: Redirecting to:', subdomainUrl);
              window.location.href = subdomainUrl;
            } else {
              console.error('[testing] Success HTML: Failed to set cookie');
              alert('Authentication completed but failed to set session. Please try again.');
            }
          }).catch(error => {
            console.error('[testing] Success HTML: Error setting cookie:', error);
            alert('Authentication completed but failed to set session. Please try again.');
          });
        }
      </script>
    </body>
    </html>
  `;
}

function createErrorHTML(message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Error</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f9fafb; }
        .container { text-align: center; max-width: 400px; padding: 2rem; }
        h1 { color: #dc2626; margin-bottom: 0.5rem; }
        p { color: #6b7280; margin-bottom: 1.5rem; }
        button { background-color: #4f46e5; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; }
        button:hover { background-color: #4338ca; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Authentication Error</h1>
        <p>${message}</p>
        <button onclick="window.close()">Close Window</button>
      </div>
    </body>
    </html>
  `;
}