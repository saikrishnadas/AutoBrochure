import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL required' }, { status: 400 })
    }

    console.log('Testing image URL:', imageUrl)

    // Test if the image URL is accessible
    const response = await fetch(imageUrl, { method: 'HEAD' })
    
    console.log('Image URL test response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (response.ok) {
      return NextResponse.json({ 
        success: true, 
        accessible: true,
        status: response.status,
        contentType: response.headers.get('content-type')
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        accessible: false,
        status: response.status,
        statusText: response.statusText
      })
    }

  } catch (error) {
    console.error('Image URL test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 