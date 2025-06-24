"use client"

import { ImageReplacer } from "@/components/image-replacer"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function ImageReplacerContent() {
  const searchParams = useSearchParams()
  const template = searchParams.get('template') || ''
  const title = searchParams.get('title') || 'Template'

  if (!template) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Image Replacer</h1>
          <p className="text-muted-foreground">No template specified</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Image Replacer</h1>
        <p className="text-muted-foreground">
          Replace white spaces in your template with custom images
        </p>
      </div>
      
      <ImageReplacer templateUrl={template} title={title} />
    </div>
  )
}

export default function ImageReplacerPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    }>
      <ImageReplacerContent />
    </Suspense>
  )
} 