"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { Download, Eye, ZoomIn, Upload, FileSpreadsheet, Image as ImageIcon } from "lucide-react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { downloadGoogleSheet } from "@/lib/sheet-utils"
import { validateUploadedSheet, validateProductSheetFromUrl, formatValidationErrors } from "@/lib/sheet-validation"
import { setUploadedData } from "@/lib/image-store"
import { toast } from "sonner"

interface ImageItem {
  id: string
  src: string
  alt: string
  title: string
  description?: string
  tags?: string[]
  googleSheetId?: string
  noOfgoogleSheetRows?: number
  googleSheetFields?: string[]
}

interface ImageGalleryProps {
  images: ImageItem[]
  className?: string
}

export function ImageGallery({ images, className }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState<ImageItem | null>(null)
  const [validationErrors, setValidationErrors] = useState<string>("")
  const [isValidating, setIsValidating] = useState(false)
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('')
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleImageClick = (imageSrc: string) => {
    setSelectedImage(imageSrc)
  }

  const closeModal = () => {
    setSelectedImage(null)
  }

  const handleDownload = (image: ImageItem) => {
    downloadGoogleSheet({
      googleSheetId: image.googleSheetId,
      noOfgoogleSheetRows: image.noOfgoogleSheetRows || 10,
      googleSheetFields: image.googleSheetFields || ['Column 1', 'Column 2', 'Column 3'],
      fileName: image.title.replace(/[^a-zA-Z0-9]/g, '_') // Sanitize filename
    })
  }

  const handleUploadClick = (image: ImageItem) => {
    setUploadingImage(image)
    setValidationErrors("")
  }

  const handleImageReplacer = (image: ImageItem) => {
    // Navigate to image replacer page
    router.push(`/image-replacer?template=${encodeURIComponent(image.src)}&title=${encodeURIComponent(image.title)}`)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !uploadingImage) return

    setIsValidating(true)
    setValidationErrors("")

    try {
      const validationResult = await validateUploadedSheet(file, {
        expectedColumns: uploadingImage.googleSheetFields || [],
        expectedMinRows: 1,
        expectedMaxRows: uploadingImage.noOfgoogleSheetRows || undefined
      })

      if (validationResult.isValid) {
        // Success - navigate to thank you page
        toast.success("Sheet uploaded successfully!")
        
        // Store uploaded data for image generation
        setUploadedData({
          templateImageUrl: "/template.png",  // Force use of Arabian Delights template
          uploadedSheetFile: file,      // Store the uploaded Excel/CSV file
          googleSheetData: validationResult.data,
          templateName: uploadingImage.title,
          templateId: uploadingImage.id
        })
        
        router.push(`/generate-brochure?template=${encodeURIComponent(uploadingImage.title)}&rows=${validationResult.actualRowCount}`)
      } else {
        // Show validation errors
        setValidationErrors(formatValidationErrors(validationResult.errors))
      }
    } catch {
      setValidationErrors("An error occurred while validating the file. Please try again.")
    } finally {
      setIsValidating(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleGoogleSheetsUrlSubmit = async () => {
    if (!googleSheetsUrl.trim() || !uploadingImage) return

    setIsValidating(true)
    setValidationErrors("")

    try {
      const validationResult = await validateProductSheetFromUrl(googleSheetsUrl.trim())

      if (validationResult.isValid) {
        // Success - navigate to thank you page
        toast.success("Google Sheets loaded successfully!")
        
        // Store uploaded data for image generation
        setUploadedData({
          templateImageUrl: "/template.png",  // Force use of Arabian Delights template
          googleSheetData: validationResult.data,
          templateName: uploadingImage.title,
          templateId: uploadingImage.id
        })
        
        router.push(`/generate-brochure?template=${encodeURIComponent(uploadingImage.title)}&rows=${validationResult.actualRowCount}`)
      } else {
        // Show validation errors
        setValidationErrors(formatValidationErrors(validationResult.errors))
      }
    } catch {
      setValidationErrors("An error occurred while loading the Google Sheets. Please try again.")
    } finally {
      setIsValidating(false)
    }
  }

  const closeUploadDialog = () => {
    setUploadingImage(null)
    setValidationErrors("")
    setGoogleSheetsUrl("")
    setUploadMethod('file')
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <div className={cn("w-full", className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <Card key={image.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300">
              <CardContent className="p-0">
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={() => handleImageClick(image.src)}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1">{image.title}</h3>
                  {image.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {image.description}
                    </p>
                  )}
                  
                  {/* Display sheet configuration info */}
                  {(image.googleSheetFields || image.noOfgoogleSheetRows) && (
                    <div className="mb-3 p-2 bg-muted rounded-md text-xs">
                      {image.noOfgoogleSheetRows && (
                        <div className="text-muted-foreground">
                          Expected Rows: {image.noOfgoogleSheetRows}
                        </div>
                      )}
                      {image.googleSheetFields && (
                        <div className="text-muted-foreground">
                          Required Columns: {image.googleSheetFields.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {image.tags && image.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {image.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImageClick(image.src)}
                      className="flex items-center gap-2 flex-1"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(image)}
                      className="flex items-center gap-2 flex-1"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleUploadClick(image)}
                    className="flex items-center gap-2 w-full mt-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Sheet
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleImageReplacer(image)}
                    className="flex items-center gap-2 w-full mt-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Image Replacer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal for full-size image view */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={selectedImage}
              alt="Full size image"
              fill
              className="object-contain"
              sizes="90vw"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4"
              onClick={closeModal}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <AlertDialog open={uploadingImage !== null} onOpenChange={closeUploadDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Load Data: {uploadingImage?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Upload a file or provide a Google Sheets URL that matches the required format.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            {uploadingImage && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="font-medium mb-2">Required Format:</div>
                <div className="text-muted-foreground">
                  <div>• Columns: {uploadingImage.googleSheetFields?.join(', ') || 'No specific columns required'}</div>
                  <div>• Expected rows: {uploadingImage.noOfgoogleSheetRows || 'Any number'}</div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label>Data Source</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={uploadMethod === 'file' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMethod('file')}
                    disabled={isValidating}
                  >
                    Upload File
                  </Button>
                  <Button
                    type="button"
                    variant={uploadMethod === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMethod('url')}
                    disabled={isValidating}
                  >
                    Google Sheets URL
                  </Button>
                </div>
              </div>

              {uploadMethod === 'file' ? (
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    disabled={isValidating}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="google-sheets-url">Google Sheets URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="google-sheets-url"
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={googleSheetsUrl}
                      onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                      disabled={isValidating}
                    />
                    <Button
                      type="button"
                      onClick={handleGoogleSheetsUrlSubmit}
                      disabled={isValidating || !googleSheetsUrl.trim()}
                      size="sm"
                    >
                      Load
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Make sure your Google Sheet is publicly accessible (Anyone with the link can view)
                  </div>
                </div>
              )}
            </div>
            
            {validationErrors && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="text-sm text-destructive font-medium">Validation Errors:</div>
                <div className="text-sm text-destructive mt-1 whitespace-pre-line">
                  {validationErrors}
                </div>
              </div>
            )}
            
            {isValidating && (
              <div className="text-center text-sm text-muted-foreground">
                Validating file...
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeUploadDialog}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 