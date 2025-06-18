import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the base URL from the request
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;
    const templateImageUrl = `${baseUrl}/arabiandelightstemplate.jpg`;
    
    console.log('🧪 Testing template URL:', templateImageUrl);
    
    // Try to fetch the template
    const templateResponse = await fetch(templateImageUrl);
    
    if (!templateResponse.ok) {
      return NextResponse.json({ 
        error: 'Template fetch failed',
        url: templateImageUrl,
        status: templateResponse.status,
        statusText: templateResponse.statusText
      }, { status: 400 });
    }
    
    const templateBlob = await templateResponse.blob();
    
    return NextResponse.json({ 
      success: true,
      message: 'Template loaded successfully',
      url: templateImageUrl,
      size: templateBlob.size,
      type: templateBlob.type,
      host: host,
      protocol: protocol,
      baseUrl: baseUrl
    });
    
  } catch (error) {
    console.error('❌ Template test error:', error);
    return NextResponse.json({ 
      error: 'Template test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 