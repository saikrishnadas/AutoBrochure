import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  try {
    console.log('=== TESTING GPT-4O VISION WITH ARABIAN DELIGHTS TEMPLATE ===')
    
    // Fetch the Arabian Delights template
    const response = await fetch('http://localhost:3000/template.png')
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString('base64')
    
    console.log('Image loaded successfully')
    console.log('Size:', blob.size)
    console.log('Type:', blob.type)
    console.log('Base64 length:', base64Image.length)
    
    // Simple test with GPT-4o Vision
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What do you see in this image? Describe it in detail, especially any text, branding, layout, and design elements."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${blob.type};base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 500
    })

    const analysis = gptResponse.choices[0]?.message?.content || "No response"
    
    console.log('GPT-4o Analysis:', analysis)
    
    return NextResponse.json({
      success: true,
      imageSize: blob.size,
      imageType: blob.type,
      base64Length: base64Image.length,
      gptAnalysis: analysis
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 