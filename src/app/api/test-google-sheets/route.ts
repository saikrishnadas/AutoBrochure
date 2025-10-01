import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testUrl = searchParams.get('url');
  
  if (!testUrl) {
    return NextResponse.json({ 
      error: 'Please provide a URL parameter. Example: /api/test-google-sheets?url=YOUR_GOOGLE_SHEETS_URL' 
    }, { status: 400 });
  }

  try {
    // Extract spreadsheet ID
    const spreadsheetId = extractSpreadsheetId(testUrl);
    if (!spreadsheetId) {
      return NextResponse.json({ 
        error: 'Could not extract spreadsheet ID from URL',
        url: testUrl,
        tip: 'Make sure your URL looks like: https://docs.google.com/spreadsheets/d/[ID]/edit...'
      }, { status: 400 });
    }

    const gid = extractGid(testUrl);
    
    // Test different URL formats
    const testUrls = [
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&id=${spreadsheetId}&gid=${gid}`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
    ];

    const results = [];
    
    for (const url of testUrls) {
      try {
        console.log('Testing URL:', url);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AutoBrochure/1.0)',
          },
        });
        
        const text = await response.text();
        
        results.push({
          url,
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          contentLength: text.length,
          preview: text.substring(0, 200),
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (response.ok) {
          break; // Stop on first success
        }
      } catch (error) {
        results.push({
          url,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    return NextResponse.json({
      originalUrl: testUrl,
      extractedId: spreadsheetId,
      extractedGid: gid,
      testResults: results,
      recommendation: results.find(r => r.success) 
        ? 'At least one URL format worked! Your sheet should be accessible.'
        : 'None of the URL formats worked. Please check that your sheet is publicly accessible.'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalUrl: testUrl
    }, { status: 500 });
  }
}

function extractSpreadsheetId(url: string): string | null {
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /^[a-zA-Z0-9-_]+$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  return null;
}

function extractGid(url: string): string {
  const gidMatch = url.match(/gid=([0-9]+)/);
  return gidMatch ? gidMatch[1] : '0';
}
