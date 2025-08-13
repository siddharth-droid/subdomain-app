import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  
  try {
    // Forward cookies to backend
    const cookieHeader = request.headers.get('cookie');
    
    // Call backend API server-side (no CORS) - LangFlow runs on port 7860
    const backendUrl = `${process.env.LLMC_BACKEND_URL}/api/v1/auth/subdomain/logout`;
    
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader || '',
        'User-Agent': request.headers.get('user-agent') || '',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
      },
    });
    
    
    const response = NextResponse.json({ success: true, message: 'Logout successful' });
    
    const setCookieHeader = backendResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      response.headers.set('set-cookie', setCookieHeader);
    }
    
    return response;
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}