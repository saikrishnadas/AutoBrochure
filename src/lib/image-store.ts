// Simple in-memory store for uploaded data
// In a real app, you'd use a database or session storage

interface UploadedData {
  templateImageUrl: string | null;
  uploadedSheetFile: File | null;
  googleSheetData: unknown | null;
  templateName: string | null;
  templateId: string | null;
}

let uploadedData: UploadedData = {
  templateImageUrl: null,
  uploadedSheetFile: null,
  googleSheetData: null,
  templateName: null,
  templateId: null
}

export function setUploadedData(data: Partial<UploadedData>) {
  console.log('🔄 Setting uploaded data:', data)
  uploadedData = { ...uploadedData, ...data }
  console.log('📊 Current uploaded data state:', uploadedData)
}

export function getUploadedData(): UploadedData {
  console.log('📖 Getting uploaded data:', uploadedData)
  return uploadedData
}

export function clearUploadedData() {
  uploadedData = {
    templateImageUrl: null,
    uploadedSheetFile: null,
    googleSheetData: null,
    templateName: null,
    templateId: null
  }
}

// Function to convert URL to File object for API calls
export async function getTemplateImageFile(): Promise<File | null> {
  if (!uploadedData.templateImageUrl) {
    console.error('No template image URL stored')
    return null
  }

  try {
    console.log('=== FETCHING TEMPLATE IMAGE ===')
    console.log('Template image URL:', uploadedData.templateImageUrl)
    
    const response = await fetch(uploadedData.templateImageUrl)
    
    console.log('Fetch response status:', response.status)
    console.log('Fetch response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      console.error('Failed to fetch template image:', response.status, response.statusText)
      return null
    }
    
    const blob = await response.blob()
    console.log('Blob size:', blob.size)
    console.log('Blob type:', blob.type)
    
    // Create a File object from the blob
    const file = new File([blob], 'template-image.jpg', { 
      type: blob.type || 'image/jpeg' 
    })
    
    console.log('Created file:', {
      name: file.name,
      type: file.type,
      size: file.size
    })
    
    return file
  } catch (error) {
    console.error('Error fetching template image:', error)
    return null
  }
} 