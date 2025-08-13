import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  try {
    const { flowId } = await params;
    
    if (!flowId) {
      return NextResponse.json(
        { error: 'Flow ID is required' },
        { status: 400 }
      );
    }


    // Get the x-api-key header
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'x-api-key header is required' },
        { status: 401 }
      );
    }

    // Get subdomain from request
    const host = request.headers.get('host');
    const subdomain = host?.split('.')[0];
    
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Invalid subdomain' },
        { status: 400 }
      );
    }

    // Get the main app API URL from environment or construct it
    const mainAppUrl = process.env.LLMC_BACKEND_URL;
    
    // Parse the JSON payload
    const payload = await request.json();

    // Execute the flow via the main app's API
    const executeResponse = await fetch(`${mainAppUrl}/api/v1/run/${flowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload)
    });

    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      console.error('[subdomain-api] Flow execution failed:', executeResponse.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'Flow execution failed',
          details: errorText,
          status: executeResponse.status 
        },
        { status: executeResponse.status }
      );
    }

    const result = await executeResponse.json();

    // Return the execution result
    return NextResponse.json({
      success: true,
      flowId,
      result,
      executedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[subdomain-api] Error executing flow:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute flow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}