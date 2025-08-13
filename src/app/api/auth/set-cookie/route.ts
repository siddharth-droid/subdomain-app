import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  
  try {
    const { sessionToken } = await request.json();
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 400 });
    }
    
    const response = NextResponse.json({ success: true });
    
    const cookieValue = `subdomain_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`;
    response.headers.set('Set-Cookie', cookieValue);
    
    
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to set cookie' }, { status: 500 });
  }
}