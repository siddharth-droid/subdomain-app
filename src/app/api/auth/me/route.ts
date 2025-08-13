import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  
  try {
    const cookieHeader = request.headers.get('cookie');
    const backendUrl = `${process.env.LLMC_BACKEND_URL}/api/v1/auth/subdomain/me`;
    
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader || '',
        'User-Agent': request.headers.get('user-agent') || '',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
      },
    });
    
    
    if (backendResponse.status === 401) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return NextResponse.json(
        { error: `Backend error: ${errorText}` },
        { status: backendResponse.status }
      );
    }
    
    const userData = await backendResponse.json();
    
    // Return user data to frontend (same origin, no CORS issues)
    return NextResponse.json(userData);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}