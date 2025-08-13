import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'x-api-key header is required' },
        { status: 401 }
      );
    }

    const mainAppUrl = process.env.LLMC_BACKEND_URL;
    
    const formData = await request.formData();

    // Log the files being uploaded
    const files = formData.getAll('files') as File[];
    files.forEach((file, index) => {
      console.log(`[subdomain-api] File ${index + 1}: ${file.name} (${file.size} bytes)`);
    });

    const uploadResponse = await fetch(`${mainAppUrl}/api/v2/files/bulk`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData
    });


    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      
      return NextResponse.json(
        { 
          error: 'File upload failed',
          details: errorText,
          status: uploadResponse.status 
        },
        { status: uploadResponse.status }
      );
    }

    const result = await uploadResponse.json();

    // Transform the result to match expected format
    const transformedFiles = result.map((file: any) => ({
      file_id: file.id,
      file_name: file.name,
      file_path: file.path,
      file_size: file.size,
      file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown'
    }));

    // Return the file upload result
    return NextResponse.json({
      success: true,
      files: transformedFiles,
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to upload files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}