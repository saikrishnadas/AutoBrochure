import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    console.log('Testing OpenAI connection...')
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        hasKey: false 
      }, { status: 500 })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Simple test call
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say hello" }],
      max_tokens: 10
    })

    return NextResponse.json({ 
      success: true,
      hasKey: true,
      keyLength: process.env.OPENAI_API_KEY.length,
      response: response.choices[0]?.message?.content
    })

  } catch (error) {
    console.error('OpenAI test error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message,
        hasKey: !!process.env.OPENAI_API_KEY,
        keyLength: process.env.OPENAI_API_KEY?.length || 0
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: 'Unknown error',
      hasKey: !!process.env.OPENAI_API_KEY
    }, { status: 500 })
  }
} 