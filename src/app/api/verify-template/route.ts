import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('=== VERIFYING ARABIAN DELIGHTS TEMPLATE ===')
    
    // Try to fetch the Arabian Delights template directly
    const templateUrl = '/arabiandelightstemplate.jpg'
    const fullUrl = `${process.env.NODE_ENV === 'production' ? 'https://yourapp.com' : 'http://localhost:3000'}${templateUrl}`
    
    console.log('Fetching template from:', fullUrl)
    
    const response = await fetch(fullUrl)
    console.log('Fetch response status:', response.status)
    console.log('Fetch response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Cannot fetch template image',
        status: response.status,
        url: fullUrl
      }, { status: 404 })
    }
    
    const blob = await response.blob()
    console.log('Blob size:', blob.size)
    console.log('Blob type:', blob.type)
    
    // Convert to buffer and check signature
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const firstBytes = buffer.toString('hex').substring(0, 16)
    console.log('First bytes (hex):', firstBytes)
    
    const isPNG = firstBytes.startsWith('89504e47')
    const isJPEG = firstBytes.startsWith('ffd8ff')
    
    // Convert to base64 for verification
    const base64 = buffer.toString('base64')
    console.log('Base64 length:', base64.length)
    console.log('Base64 starts with:', base64.substring(0, 50))
    
    return NextResponse.json({ 
      success: true,
      templateUrl,
      fullUrl,
      size: blob.size,
      type: blob.type,
      isPNG,
      isJPEG,
      firstBytesHex: firstBytes,
      base64Preview: base64.substring(0, 100),
      base64Length: base64.length
    })

  } catch (error) {
    console.error('Template verification error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 