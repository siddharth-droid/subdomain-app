import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  console.log('[DEBUG CALLBACK] === AUTH CALLBACK START ===');
  console.log('[DEBUG CALLBACK] Request URL:', request.url);
  
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  console.log('[DEBUG CALLBACK] Search params:');
  console.log('[DEBUG CALLBACK] - code:', code ? `${code.substring(0, 10)}...` : 'null');
  console.log('[DEBUG CALLBACK] - state:', state);
  console.log('[DEBUG CALLBACK] - error:', error);
  console.log('[DEBUG CALLBACK] - errorDescription:', errorDescription);

  // Handle OAuth errors
  if (error) {
    console.error('[DEBUG CALLBACK] OAuth error detected:', error, errorDescription);
    return new Response(createErrorHTML(`Authentication failed: ${errorDescription || error}`), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Check for authorization code
  if (!code || !state) {
    console.error('[DEBUG CALLBACK] Missing code or state - code:', !!code, 'state:', !!state);
    return new Response(createErrorHTML('Missing authorization code or state'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    // Extract subdomain from state
    const stateMatch = state.match(/subdomain:([^:]+)/);
    const subdomain = stateMatch ? stateMatch[1] : null;

    console.log('[DEBUG CALLBACK] State parsing:');
    console.log('[DEBUG CALLBACK] - stateMatch:', stateMatch);
    console.log('[DEBUG CALLBACK] - extracted subdomain:', subdomain);

    if (!subdomain) {
      console.error('[DEBUG CALLBACK] Failed to extract subdomain from state:', state);
      return new Response(createErrorHTML('Invalid state parameter'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const backendUrl = process.env.LLMC_BACKEND_URL;
    console.log('[DEBUG CALLBACK] Backend URL:', backendUrl);
    console.log('[DEBUG CALLBACK] Making backend request with subdomain:', subdomain);
    
    const backendResponse = await fetch(`${backendUrl}/api/v1/auth/subdomain/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, subdomain }),
    });

    console.log('[DEBUG CALLBACK] Backend response status:', backendResponse.status);
    console.log('[DEBUG CALLBACK] Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[DEBUG CALLBACK] Backend error details:');
      console.error('[DEBUG CALLBACK] - Status:', backendResponse.status);
      console.error('[DEBUG CALLBACK] - Status text:', backendResponse.statusText);
      console.error('[DEBUG CALLBACK] - Error text:', errorText);
      return new Response(createErrorHTML('Authentication failed on server'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    let sessionToken = '';
    const setCookieHeader = backendResponse.headers.get('set-cookie');
    console.log('[DEBUG CALLBACK] Set-Cookie header:', setCookieHeader);
    
    if (setCookieHeader) {
      const cookieMatch = setCookieHeader.match(/subdomain_session=([^;]+)/);
      console.log('[DEBUG CALLBACK] Cookie match result:', cookieMatch);
      if (cookieMatch) {
        sessionToken = cookieMatch[1];
        console.log('[DEBUG CALLBACK] Extracted session token length:', sessionToken.length);
      }
    }

    console.log('[DEBUG CALLBACK] Returning success HTML for subdomain:', subdomain);
    return new Response(createSuccessHTML(subdomain, sessionToken), {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('[DEBUG CALLBACK] Unexpected error in callback:', error);
    console.error('[DEBUG CALLBACK] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
        console.log('[DEBUG SUCCESS] === SUCCESS HTML SCRIPT START ===');
        console.log('[DEBUG SUCCESS] Subdomain:', '${subdomain}');
        console.log('[DEBUG SUCCESS] Session token length:', '${sessionToken}'.length);
        console.log('[DEBUG SUCCESS] Session token preview:', '${sessionToken}'.substring(0, 10) + '...');
        console.log('[DEBUG SUCCESS] Window opener exists:', !!window.opener);
        console.log('[DEBUG SUCCESS] Current URL:', window.location.href);
        
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
              const devDomain = '${process.env.NEXT_PUBLIC_DEV_DOMAIN}' || '.dev-beta.llmcontrols.ai';
              const prodDomain = '${process.env.NEXT_PUBLIC_PROD_DOMAIN}' || '.llmcontrols.ai';
              
              // Use dev domain for dev-beta environment, prod domain for production
              const domain = devDomain.substring(1); // Remove leading dot -> "dev-beta.llmcontrols.ai"
              const protocol = 'https'; // Always use https for llmcontrols.ai domains
              
              const subdomainUrl = \`\${protocol}://\${subdomain}.\${domain}/\`;
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