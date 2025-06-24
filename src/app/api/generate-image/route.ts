import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('API route called - Full GPT-4o Vision Mode')
    
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured')
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const formData = await request.formData()
    console.log('FormData received')
    
    const templateImage = formData.get('templateImage') as File
    const googleSheetData = formData.get('googleSheetData') as string
    const templateName = formData.get('templateName') as string

    console.log('Template name:', templateName)
    console.log('Image file:', templateImage?.name, templateImage?.type, templateImage?.size)
    console.log('Sheet data length:', googleSheetData?.length)

    if (!templateImage) {
      return NextResponse.json({ error: 'Template image is required' }, { status: 400 })
    }

    // Debug: Check if we actually received an image file
    console.log('=== IMAGE DEBUG INFO ===')
    console.log('File name:', templateImage.name)
    console.log('File type:', templateImage.type)
    console.log('File size:', templateImage.size)
    console.log('Is actually a File object:', templateImage instanceof File)
    
    // Convert image to base64
    console.log('Converting image to base64...')
    const imageBuffer = await templateImage.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    console.log('Image converted, size:', base64Image.length)
    console.log('Base64 starts with:', base64Image.substring(0, 50) + '...')
    
    // Debug: Check if base64 looks like a valid image
    const isValidImageBase64 = base64Image.startsWith('/9j/') || // JPEG
                              base64Image.startsWith('iVBORw0KGgo') || // PNG
                              base64Image.startsWith('R0lGOD') || // GIF
                              base64Image.startsWith('UklGR'); // WebP
    console.log('Base64 appears to be valid image:', isValidImageBase64)
    
    // CRITICAL DEBUG: Save the image we're actually sending for verification
    console.log('=== SAVING IMAGE FOR VERIFICATION ===')
    console.log('Creating debug image URL to verify what we are sending...')
    const debugImageUrl = `data:${templateImage.type};base64,${base64Image.substring(0, 100)}...`
    console.log('Debug image data URL prefix:', debugImageUrl)
    
    // Additional verification - let's check the first few bytes after base64 decode
    const firstBytes = Buffer.from(base64Image.substring(0, 100), 'base64')
    console.log('First bytes of image (hex):', firstBytes.toString('hex').substring(0, 32))
    
    // PNG files should start with 89504E47 (PNG signature)
    // JPEG files should start with FFD8FF
    const isPNG = firstBytes.toString('hex').startsWith('89504e47')
    const isJPEG = firstBytes.toString('hex').startsWith('ffd8ff')
    console.log('Is PNG signature correct:', isPNG)
    console.log('Is JPEG signature correct:', isJPEG)

    // Create the prompt for GPT-4o with your specific requirements
    const prompt = `You are analyzing the "Arabian Delights" marketing brochure template. This is a professionally designed marketing flyer with specific Arabian/Islamic design elements that must be preserved exactly.

    Template: ${templateName}
    Google Sheet Data: ${googleSheetData}
    
    CRITICAL ANALYSIS REQUIRED - This is a DESIGNED TEMPLATE that must be replicated with exact precision:

    DESIGN STRUCTURE TO PRESERVE:
    1. LAYOUT: Multiple ornate golden/bronze decorative frames arranged in a grid
    2. BRANDING: "Arabian Delights" title text and NESTO logo placement
    3. BACKGROUND: Dark brown/bronze textured background with Islamic patterns
    4. DECORATIVE ELEMENTS: Ornate Islamic/Arabian geometric frames around each product
    5. TYPOGRAPHY: Specific font styles for product names and prices
    - PRICING FORMAT: Red circular price tags with currency symbols
    - PRODUCT INFO: Weight specifications (500g, etc.)
    - THEME: Arabian/Islamic aesthetic with hanging lanterns and decorative elements

    CURRENT CONTENT TO ANALYZE:
    - Identify the vegetables in each ornate frame
    - Note the exact pricing format and styling
    - Observe the product name typography and placement
    - Document the decorative frame styles

    REPLACEMENT STRATEGY:
    Provide instructions for creating the EXACT same template design but with different vegetables and updated prices from the Google Sheet data. The design, layout, branding, and Arabian theme must remain 100% identical.

    Focus on preserving every design element while only changing the vegetable images and price numbers.`

    console.log('Calling GPT-4o Vision for image analysis...')
    // Analyze image using GPT-4o vision
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${templateImage.type};base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 800
    })

    console.log('GPT-4o analysis completed')
    const imageAnalysis = analysisResponse.choices[0]?.message?.content || "A professional food image with vegetables"
    console.log('Image analysis:', imageAnalysis.substring(0, 200) + '...')

    // REALITY CHECK: OpenAI API cannot replicate ChatGPT UI's image editing capabilities
    // Let's provide the original template back with detailed editing instructions
    console.log('Providing original template with editing instructions...')
    
    // Since API limitations prevent exact replication, return the original template
    // with detailed instructions for achieving the desired result
    const editingInstructions = `
TEMPLATE ANALYSIS: ${imageAnalysis}

GOOGLE SHEET DATA: ${googleSheetData}

EDITING INSTRUCTIONS TO ACHIEVE YOUR GOAL:
1. Use the original Arabian Delights template as your base
2. Replace vegetables in each ornate frame with: [suggested vegetables based on sheet data]
3. Update price circles with new values from your Google Sheet
4. Maintain all branding, layout, and decorative elements exactly

LIMITATION NOTICE: The OpenAI public API cannot perform the same image editing that ChatGPT UI can do. 
ChatGPT UI has access to internal image editing tools that are not available through the public API.

RECOMMENDED SOLUTION: 
- Use image editing software (Photoshop, Canva, etc.) to modify the template
- Or use ChatGPT UI directly for image editing
- The API is limited to generating new images, not editing existing branded templates
`

    // Return the original template URL so user can work with it
    const originalTemplateUrl = `http://localhost:3000/template.png`
    
    return NextResponse.json({ 
      success: true, 
      imageUrl: originalTemplateUrl, // Return original template
      description: editingInstructions,
      originalTemplate: templateName,
      method: 'template_with_instructions',
      apiLimitation: true,
      message: "OpenAI API cannot replicate ChatGPT UI's image editing. Use ChatGPT UI directly or image editing software."
    })

  } catch (error) {
    console.error('Detailed error in image generation:', error)
    
    // Enhanced error handling
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      // Check for specific OpenAI errors
      if (error.message.includes('API key')) {
        return NextResponse.json({ error: 'Invalid OpenAI API key' }, { status: 401 })
      }
      if (error.message.includes('quota') || error.message.includes('rate')) {
        return NextResponse.json({ error: 'API quota exceeded or rate limited' }, { status: 429 })
      }
      if (error.message.includes('billing') || error.message.includes('payment')) {
        return NextResponse.json({ error: 'Billing issue with OpenAI account' }, { status: 402 })
      }
      if (error.message.includes('content_policy')) {
        return NextResponse.json({ error: 'Content policy violation - please try a different image' }, { status: 400 })
      }
      
      return NextResponse.json(
        { error: `Generation failed: ${error.message}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    )
  }
} 