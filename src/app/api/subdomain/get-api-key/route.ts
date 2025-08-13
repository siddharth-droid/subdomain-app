import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {

    // Get the request body
    const body = await request.json();
    const { subdomain, flowId } = body;

    if (!subdomain || !flowId) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Subdomain and flowId are required' 
        },
        { status: 400 }
      );
    }

    const mainAppUrl = process.env.LLMC_BACKEND_URL;
    
    const response = await fetch(`${mainAppUrl}/api/v1/auth/subdomain/get-api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subdomain,
        flowId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      return NextResponse.json(
        { 
          success: false,
          message: errorData.detail || 'Failed to get API key' 
        },
        { status: response.status }
      );
    }

    const apiKeyData = await response.json();

    return NextResponse.json(apiKeyData);

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to get API key',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}