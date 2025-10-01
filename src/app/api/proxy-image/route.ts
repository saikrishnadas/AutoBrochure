import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    // Decode the URL
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Convert Google Drive URLs to direct format
    let finalUrl = decodedUrl;
    
    // Handle different Google Drive URL formats
    const googleDrivePatterns = [
      { pattern: /drive\.google\.com\/uc\?export=view&id=([a-zA-Z0-9_-]+)/, replacement: 'https://lh3.googleusercontent.com/d/$1' },
      { pattern: /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/, replacement: 'https://lh3.googleusercontent.com/d/$1' },
      { pattern: /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/, replacement: 'https://lh3.googleusercontent.com/d/$1' }
    ];
    
    for (const { pattern, replacement } of googleDrivePatterns) {
      if (pattern.test(decodedUrl)) {
        finalUrl = decodedUrl.replace(pattern, replacement);
        console.log('Converted Google Drive URL:', decodedUrl, '→', finalUrl);
        break;
      }
    }

    // Fetch the image
    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer();

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in proxy-image API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

