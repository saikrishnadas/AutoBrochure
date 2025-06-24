"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, FileText, Download, Loader2, Brain, Palette } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { getUploadedData, getTemplateImageFile } from "@/lib/image-store"
import { toast } from "sonner"
import { TemplateEditor } from "@/components/template-editor"

interface TemplateEditorData {
  originalImage: string;
  vegetables: Array<{
    id: number;
    name: string;
    price: string;
    description?: string;
  }>;
  vegetableRegions: Array<{
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  priceRegions: Array<{
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

function GenerateBrochureContent() {
  const searchParams = useSearchParams()
  const templateName = searchParams.get('template') || 'Template'
  const rowCount = searchParams.get('rows') || '0'
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<'analyzing' | 'generating' | 'complete'>('complete')
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [imageDescription, setImageDescription] = useState<string>("")
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [templateEditorData, setTemplateEditorData] = useState<TemplateEditorData | null>(null)

  const handleGenerateBrochure = async () => {
    setIsGenerating(true)
    setGenerationStep('analyzing')
    
    try {
      const uploadedData = getUploadedData()
      
      console.log('=== UPLOADED DATA DEBUG ===')
      console.log('Template image URL:', uploadedData.templateImageUrl)
      console.log('Template name:', uploadedData.templateName)
      console.log('Template ID:', uploadedData.templateId)
      
      // Type assertion for googleSheetData
      const sheetData = uploadedData.googleSheetData as unknown[][];
      console.log('Sheet data rows:', sheetData?.length)
      
      // Verify we're using the correct template
      if (uploadedData.templateImageUrl !== '/template.png') {
        console.warn('WARNING: Not using the correct template image!')
        console.warn('Expected: /template.png')
        console.warn('Actual:', uploadedData.templateImageUrl)
      }
      
      if (!uploadedData.templateImageUrl || !uploadedData.googleSheetData) {
        toast.error("Missing uploaded data. Please upload a template again.")
        return
      }

      // Get the template image file from URL
      console.log('Fetching template image from:', uploadedData.templateImageUrl)
      const templateImageFile = await getTemplateImageFile()
      
      if (!templateImageFile) {
        toast.error("Failed to load template image. Please try again.")
        return
      }

      console.log('Template image file loaded:', {
        name: templateImageFile.name,
        type: templateImageFile.type,
        size: templateImageFile.size
      })

      // Prepare form data
      const formData = new FormData()
      formData.append('templateImage', templateImageFile)
      formData.append('googleSheetData', JSON.stringify(sheetData))
      formData.append('templateName', uploadedData.templateName || templateName)

      // Update progress
      setGenerationStep('generating')

      console.log('Sending request to API...')
      // Call the API
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      console.log('API response:', result)

      if (result.success) {
        setGeneratedImageUrl(result.imageUrl)
        setImageDescription(result.description)
        setGenerationStep('complete')
        toast.success("Brochure generated successfully!")
      } else {
        toast.error(result.error || "Failed to generate brochure")
        console.error('Generation error:', result.error)
      }
    } catch (error) {
      console.error('Error generating brochure:', error)
      toast.error("An error occurred while generating the brochure")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateBrochureFree = async () => {
    setIsGenerating(true)
    setGenerationStep('analyzing')
    
    try {
      const uploadedData = getUploadedData()
      
      if (!uploadedData.googleSheetData) {
        toast.error("Missing uploaded data. Please upload a template again.")
        return
      }

      // Type assertion for googleSheetData
      const sheetData = uploadedData.googleSheetData as unknown[][];
      
      // Extract vegetables from the sheet data
      const vegetables = sheetData.slice(1).map((row: unknown[], index: number) => ({
        id: index + 1,
        name: (row[0] as string) || `Item ${index + 1}`,
        price: (row[1] as string) || '',
        description: (row[2] as string) || ''
      }))

      console.log('🆓 Starting FREE AI generation with vegetables:', vegetables)

      // Update progress
      setGenerationStep('generating')

      // Call the FREE API
      const response = await fetch('/api/generate-image-free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vegetables: vegetables,
          templateId: uploadedData.templateId || 'default'
        }),
      })

      const result = await response.json()
      console.log('Free AI response:', result)

      if (result.success) {
        setGeneratedImageUrl(result.editedImage)
        setImageDescription(`${result.message} - Generated with ${result.aiProvider} ${result.model}`)
        setGenerationStep('complete')
        toast.success("FREE AI brochure generated successfully!")
      } else {
        toast.error(result.error || "Failed to generate brochure with free AI")
        console.error('Free generation error:', result.error)
      }
    } catch (error) {
      console.error('Error generating free brochure:', error)
      toast.error("An error occurred while generating with free AI")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateBrochureCanvas = async () => {
    setIsGenerating(true)
    setGenerationStep('analyzing')
    
    try {
      const uploadedData = getUploadedData()
      
      if (!uploadedData.googleSheetData) {
        toast.error("Missing uploaded data. Please upload a template again.")
        return
      }

      // Type assertion for googleSheetData
      const sheetData = uploadedData.googleSheetData as unknown[][];
      
      // Extract vegetables from the sheet data
      const vegetables = sheetData.slice(1).map((row: unknown[], index: number) => ({
        id: index + 1,
        name: (row[0] as string) || `Item ${index + 1}`,
        price: (row[1] as string) || '',
        description: (row[2] as string) || ''
      }))

      console.log('🎨 Starting Canvas-based template editing with vegetables:', vegetables)

      // Update progress
      setGenerationStep('generating')

      // Call the Canvas API
      const response = await fetch('/api/generate-image-canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vegetables: vegetables,
          templateId: uploadedData.templateId || 'default'
        }),
      })

      const result = await response.json()
      console.log('Canvas processing response:', result)

      if (result.success) {
        // For Canvas processing, we need to show instructions rather than a final image
        setImageDescription(`${result.message} - Use Canvas API for ${result.editingMethod}`)
        setGenerationStep('complete')
        
        // Show instructions for Canvas editing
        toast.success("Canvas editing instructions prepared! Check the processing steps.")
      } else {
        toast.error(result.error || "Failed to prepare Canvas editing")
        console.error('Canvas preparation error:', result.error)
      }
    } catch (error) {
      console.error('Error preparing Canvas editing:', error)
      toast.error("An error occurred while preparing Canvas editing")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExactTemplateEdit = async () => {
    setIsGenerating(true)
    setGenerationStep('analyzing')
    
    try {
      const uploadedData = getUploadedData()
      
      if (!uploadedData.googleSheetData) {
        toast.error("Missing uploaded data. Please upload a template again.")
        return
      }

      // Type assertion for googleSheetData
      const sheetData = uploadedData.googleSheetData as unknown[][];
      
      // Extract vegetables from the sheet data
      const vegetables = sheetData.slice(1).map((row: unknown[], index: number) => ({
        id: index + 1,
        name: (row[0] as string) || `Item ${index + 1}`,
        price: (row[1] as string) || '',
        description: (row[2] as string) || ''
      }))

      console.log('🎯 Starting EXACT template preservation with vegetables:', vegetables)

      // Update progress
      setGenerationStep('generating')

      // Call the template preservation API
      const response = await fetch('/api/generate-image-preserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vegetables: vegetables,
          templateId: uploadedData.templateId || 'default'
        }),
      })

      const result = await response.json()
      console.log('Template preservation response:', result)

      if (result.success && result.preserveTemplate) {
        // Show the template editor component
        setTemplateEditorData(result as TemplateEditorData)
        setShowTemplateEditor(true)
        setGenerationStep('complete')
        toast.success("Template editor loaded! Your exact template will be preserved.")
      } else {
        toast.error(result.error || "Failed to prepare template editor")
        console.error('Template preservation error:', result.error)
      }
    } catch (error) {
      console.error('Error preparing template editor:', error)
      toast.error("An error occurred while preparing template editor")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadImage = async () => {
    if (!generatedImageUrl) return

    try {
      const response = await fetch(generatedImageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `${templateName.replace(/[^a-zA-Z0-9]/g, '_')}_AI_generated.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success("Image downloaded successfully!")
    } catch (error) {
      console.error('Error downloading image:', error)
      toast.error("Failed to download image")
    }
  }

  const getLoadingContent = () => {
    if (generationStep === 'analyzing') {
      return {
        icon: <Brain className="h-6 w-6 mr-2 animate-pulse text-blue-500" />,
        text: "AI is analyzing your vegetables data...",
        subtitle: "Preparing optimized prompt for image generation"
      }
    } else if (generationStep === 'generating') {
      return {
        icon: <Palette className="h-6 w-6 mr-2 animate-pulse text-purple-500" />,
        text: "Creating your new brochure image...",
        subtitle: "Generating professional food photography with your vegetables"
      }
    }
    return {
      icon: <Loader2 className="h-6 w-6 mr-2 animate-spin" />,
      text: "Please wait...",
      subtitle: "Processing your request"
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8 text-center">
          {!generatedImageUrl ? (
            <div>
              <div className="flex justify-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              
              <h1 className="text-2xl font-bold mb-4 text-green-700">
                Thank You!
              </h1>
              
              <p className="text-muted-foreground mb-6">
                Your sheet "{templateName}" has been successfully uploaded and validated.
              </p>
              
              <div className="bg-muted p-4 rounded-lg mb-6">
                <p className="text-sm">
                  <strong>Template:</strong> {templateName}<br />
                  <strong>Rows processed:</strong> {rowCount}
                </p>
              </div>
              
              {isGenerating && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-center mb-2">
                    {getLoadingContent().icon}
                    <span className="font-medium">{getLoadingContent().text}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getLoadingContent().subtitle}
                  </p>
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: generationStep === 'analyzing' ? '30%' : 
                               generationStep === 'generating' ? '70%' : '100%' 
                      }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3 mb-6">
                <Button 
                  onClick={handleGenerateBrochure}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating with OpenAI...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Generate with OpenAI (Premium)
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleGenerateBrochureFree}
                  disabled={isGenerating}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating with FREE AI...
                    </>
                  ) : (
                    <>
                      <Palette className="mr-2 h-4 w-4" />
                      Generate with FREE AI (Template Editing)
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleExactTemplateEdit}
                  disabled={isGenerating}
                  variant="default"
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing Exact Template Editor...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      EXACT Template Preservation (FREE)
                    </>
                  )}
                </Button>
              </div>
              
              {/* Show Template Editor if available */}
              {showTemplateEditor && templateEditorData && (
                <div className="mt-6">
                  <TemplateEditor
                    templateUrl={templateEditorData.originalImage}
                    vegetables={templateEditorData.vegetables}
                    vegetableRegions={templateEditorData.vegetableRegions}
                    priceRegions={templateEditorData.priceRegions}
                  />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {isGenerating 
                  ? "AI is analyzing your template and creating a new image with different vegetables. This may take 30-60 seconds..."
                  : "Click above to use GPT-4o and DALL-E 3 to generate a new professional food image inspired by your template with different vegetables. Note: The AI will create a new image with similar style and appeal rather than an exact copy."
                }
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold mb-4 text-green-700">
                🎉 AI Brochure Generated!
              </h1>
              
              <div className="mb-6">
                <div className="relative w-full max-w-md mx-auto aspect-square">
                  <img
                    src={generatedImageUrl}
                    alt="AI Generated brochure with new vegetables"
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                    onError={(e) => {
                      console.error('Image load error:', e)
                      toast.error("Failed to load generated image")
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully')
                    }}
                  />
                </div>
              </div>
              
              {imageDescription && (
                <div className="bg-muted p-4 rounded-lg mb-6">
                  <p className="text-sm">
                    <strong>🤖 AI Analysis:</strong> {imageDescription}
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <Button 
                  onClick={handleDownloadImage}
                  className="w-full" 
                  size="lg"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download AI Generated Image
                </Button>
                
                <Button 
                  onClick={handleGenerateBrochure}
                  disabled={isGenerating}
                  variant="outline"
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Another Version
                    </>
                  )}
                </Button>
                
                <Button 
                  asChild
                  variant="ghost"
                  className="w-full"
                >
                  <Link href="/">
                    Back to Gallery
                  </Link>
                </Button>
              </div>
              
              <div className="mt-6 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-700 dark:text-green-300">
                  ✨ This image was created using GPT-4o for analysis and DALL-E 3 for generation
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function GenerateBrochurePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">
              <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-6"></div>
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-6"></div>
              <div className="h-20 bg-gray-200 rounded mb-6"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <GenerateBrochureContent />
    </Suspense>
  )
} 