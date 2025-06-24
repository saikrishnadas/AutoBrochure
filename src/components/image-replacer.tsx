"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Trash2, Square, Image as ImageIcon, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { validateUploadedSheet, formatValidationErrors } from '@/lib/sheet-validation';
import * as XLSX from 'xlsx';

interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selectedImage?: string;
  type: 'image' | 'text';
  text?: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
}

interface ImageReplacerProps {
  templateUrl: string;
  title: string;
}

const REPLACEMENT_IMAGES = [
  "/imagesToReplace/ChatGPT Image Jun 23, 2025, 08_54_26 PM.png",
  "/imagesToReplace/ChatGPT Image Jun 23, 2025, 08_54_29 PM.png",
  "/imagesToReplace/ChatGPT Image Jun 23, 2025, 08_54_30 PM.png",
  "/imagesToReplace/ChatGPT Image Jun 23, 2025, 08_54_31 PM.png",
  "/imagesToReplace/ChatGPT Image Jun 23, 2025, 08_54_32 PM.png"
];

export function ImageReplacer({ templateUrl, title }: ImageReplacerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<Rectangle | null>(null);
  const [selectedRectangle, setSelectedRectangle] = useState<string | null>(null);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [rectangleType, setRectangleType] = useState<'image' | 'text'>('image');
  const [textInput, setTextInput] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [fontColor, setFontColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [sheetImages, setSheetImages] = useState<string[]>([]);
  const [isUploadingSheet, setIsUploadingSheet] = useState(false);

  // Load template image and setup canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate scale to fit canvas in container
      const maxWidth = 800;
      const maxHeight = 600;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      setCanvasScale(scale);
      imageRef.current = img;
      setTemplateLoaded(true);
      
      // Draw the template image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      redrawCanvas();
    };
    img.src = templateUrl;
  }, [templateUrl]);

  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw template
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw all rectangles
    rectangles.forEach((rect) => {
      drawRectangle(ctx, rect, rect.id === selectedRectangle);
    });

    // Draw current rectangle being drawn
    if (currentRect) {
      drawRectangle(ctx, currentRect, false, true);
    }
  }, [rectangles, selectedRectangle, currentRect]);

  const drawRectangle = (
    ctx: CanvasRenderingContext2D, 
    rect: Rectangle, 
    isSelected: boolean = false, 
    isDrawing: boolean = false
  ) => {
    const x = rect.x * canvasScale;
    const y = rect.y * canvasScale;
    const width = rect.width * canvasScale;
    const height = rect.height * canvasScale;

    // Draw rectangle border
    ctx.strokeStyle = isSelected ? '#ff0000' : isDrawing ? '#00ff00' : '#0066cc';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash(isDrawing ? [5, 5] : []);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);

    // Draw semi-transparent overlay
    ctx.fillStyle = isSelected ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 102, 204, 0.1)';
    ctx.fillRect(x, y, width, height);

    // Draw label
    const label = rect.type === 'text' 
      ? rect.text ? `Text: ${rect.text.substring(0, 10)}${rect.text.length > 10 ? '...' : ''}`
        : `Text Area ${rectangles.indexOf(rect) + 1}`
      : rect.selectedImage ? `Image ${rectangles.indexOf(rect) + 1}` 
        : `Area ${rectangles.indexOf(rect) + 1}`;
    ctx.fillStyle = isSelected ? '#ff0000' : '#0066cc';
    ctx.font = '12px Arial';
    ctx.fillText(label, x + 5, y + 15);
  };

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / canvasScale,
      y: (event.clientY - rect.top) / canvasScale
    };
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotationMode) return;

    const coords = getCanvasCoordinates(event);
    setIsDrawing(true);
    setStartPoint(coords);
    setCurrentRect({
      id: Date.now().toString(),
      x: coords.x,
      y: coords.y,
      width: 0,
      height: 0,
      type: rectangleType
    });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;

    const coords = getCanvasCoordinates(event);
    const width = coords.x - startPoint.x;
    const height = coords.y - startPoint.y;

    setCurrentRect({
      id: Date.now().toString(),
      x: Math.min(startPoint.x, coords.x),
      y: Math.min(startPoint.y, coords.y),
      width: Math.abs(width),
      height: Math.abs(height),
      type: rectangleType
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return;

    // Only add rectangle if it's large enough
    if (currentRect.width > 10 && currentRect.height > 10) {
      setRectangles(prev => [...prev, { ...currentRect, id: Date.now().toString() }]);
      toast.success("Area marked for replacement!");
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  };

  const handleRectangleClick = (rectId: string) => {
    if (isAnnotationMode) return;
    setSelectedRectangle(selectedRectangle === rectId ? null : rectId);
  };

  const assignImageToRectangle = (imageUrl: string) => {
    if (!selectedRectangle) return;

    setRectangles(prev => 
      prev.map(rect => 
        rect.id === selectedRectangle 
          ? { ...rect, selectedImage: imageUrl }
          : rect
      )
    );
    toast.success("Image assigned to area!");
  };

  const assignTextToRectangle = (text: string) => {
    if (!selectedRectangle) return;

    setRectangles(prev => 
      prev.map(rect => 
        rect.id === selectedRectangle 
          ? { 
              ...rect, 
              text: text,
              fontSize: fontSize,
              fontColor: fontColor,
              backgroundColor: backgroundColor
            }
          : rect
      )
    );
    toast.success("Text assigned to area!");
  };

  const deleteRectangle = (rectId: string) => {
    setRectangles(prev => prev.filter(rect => rect.id !== rectId));
    if (selectedRectangle === rectId) {
      setSelectedRectangle(null);
    }
    toast.success("Area deleted!");
  };

  const generateFinalImage = async () => {
    if (!canvasRef.current || !imageRef.current) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create a new canvas with original image dimensions
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) return;

      finalCanvas.width = imageRef.current.width;
      finalCanvas.height = imageRef.current.height;

      // Draw original template
      finalCtx.drawImage(imageRef.current, 0, 0);

      // Replace areas with selected images or text
      for (const rect of rectangles) {
        if (rect.type === 'image' && rect.selectedImage) {
          const img = document.createElement('img');
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = rect.selectedImage!;
          });

          // Draw the replacement image in the specified rectangle
          finalCtx.drawImage(
            img,
            rect.x,
            rect.y,
            rect.width,
            rect.height
          );
        } else if (rect.type === 'text' && rect.text) {
          // Draw background
          if (rect.backgroundColor) {
            finalCtx.fillStyle = rect.backgroundColor;
            finalCtx.fillRect(rect.x, rect.y, rect.width, rect.height);
          }

          // Draw text
          finalCtx.fillStyle = rect.fontColor || '#000000';
          finalCtx.font = `${rect.fontSize || 16}px Arial`;
          finalCtx.textAlign = 'center';
          finalCtx.textBaseline = 'middle';
          
          // Center the text in the rectangle
          const centerX = rect.x + rect.width / 2;
          const centerY = rect.y + rect.height / 2;
          
          finalCtx.fillText(rect.text, centerX, centerY);
        }
      }

      // Convert to blob and create download URL
      const blob = await new Promise<Blob>((resolve) => {
        finalCanvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
      });
      
      const url = URL.createObjectURL(blob);
      setEditedImageUrl(url);
      
      toast.success("Final image generated successfully!");

    } catch (error) {
      console.error('Error generating final image:', error);
      toast.error("Failed to generate final image. Please try again.");
    }
  };

  const downloadImage = () => {
    if (!editedImageUrl) return;
    
    const a = document.createElement('a');
    a.href = editedImageUrl;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_edited.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast.success("Image downloaded successfully!");
  };

  const handleSheetUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingSheet(true);
    setValidationErrors([]);

    try {
      // Use a more flexible validation approach
      const validationResult = await validateSheetForImages(file);

      if (validationResult.isValid && validationResult.data) {
        setSheetData(validationResult.data);
        setSheetImages(validationResult.imageUrls);
        toast.success(`Sheet uploaded successfully! Found ${validationResult.imageUrls.length} images.`);
      } else {
        setValidationErrors(validationResult.errors);
        toast.error('Sheet validation failed. Please check the format.');
      }
    } catch (error) {
      console.error('Error processing sheet:', error);
      setValidationErrors(['Error processing the uploaded file.']);
      toast.error('Failed to process sheet. Please try again.');
    } finally {
      setIsUploadingSheet(false);
    }
  };

  // Custom validation function for image sheets
  const validateSheetForImages = (file: File): Promise<{
    isValid: boolean;
    errors: string[];
    data?: any[][];
    imageUrls: string[];
  }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to array of arrays
          const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '' 
          });
          
          const errors: string[] = [];
          
          // Check if sheet has data
          if (!sheetData || sheetData.length === 0) {
            errors.push("The uploaded sheet is empty.");
            resolve({ isValid: false, errors, imageUrls: [] });
            return;
          }
          
          // Get header row
          const headerRow = sheetData[0] || [];
          
          // Find the image column (case-insensitive)
          const imageColumnIndex = headerRow.findIndex((col: string) => 
            col?.toLowerCase().trim() === 'image'
          );
          
          if (imageColumnIndex === -1) {
            errors.push("Sheet must contain a column named 'image'.");
            resolve({ isValid: false, errors, imageUrls: [] });
            return;
          }
          
          // Extract image URLs from the image column
          const rawImageUrls = sheetData
            .slice(1) // Skip header row
            .map((row: any[]) => row[imageColumnIndex])
            .filter((url: string) => url && url.trim()) // Filter out empty values
            .map((url: string) => url.trim());
          
          // Convert Google Drive share links to direct image URLs
          const imageUrls = rawImageUrls.map(url => convertGoogleDriveUrl(url));
          
          if (imageUrls.length === 0) {
            errors.push("No valid image URLs found in the 'image' column.");
            resolve({ isValid: false, errors, imageUrls: [] });
            return;
          }
          
          resolve({
            isValid: true,
            errors: [],
            data: sheetData,
            imageUrls: imageUrls
          });
          
        } catch (error) {
          resolve({
            isValid: false,
            errors: [`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`],
            imageUrls: []
          });
        }
      };
      
      reader.onerror = () => {
        resolve({
          isValid: false,
          errors: ['Error reading the uploaded file. Please try again.'],
          imageUrls: []
        });
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  // Utility function to convert Google Drive share URLs to direct image URLs
  const convertGoogleDriveUrl = (url: string): string => {
    // Check if it's a Google Drive share link
    const driveShareMatch = url.match(/https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/);
    if (driveShareMatch) {
      const fileId = driveShareMatch[1];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    
    // If it's already a direct link or different format, return as is
    return url;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {title} - Image Replacer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setIsAnnotationMode(!isAnnotationMode)}
                variant={isAnnotationMode ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                {isAnnotationMode ? "Exit Annotation Mode" : "Start Annotation Mode"}
              </Button>

              {isAnnotationMode && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Type:</label>
                  <select 
                    value={rectangleType} 
                    onChange={(e) => setRectangleType(e.target.value as 'image' | 'text')}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="image">Image</option>
                    <option value="text">Text</option>
                  </select>
                </div>
              )}
              
              <Button
                onClick={generateFinalImage}
                disabled={rectangles.length === 0 || rectangles.every(r => r.type === 'image' ? !r.selectedImage : !r.text)}
                variant="default"
              >
                Generate Final Image
              </Button>
              
              <Button
                onClick={downloadImage}
                disabled={!editedImageUrl}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              <div className="font-medium mb-1">Instructions:</div>
              {isAnnotationMode ? (
                <div>
                  • Select "Image" or "Text" type before drawing<br/>
                  • Click and drag on the template to draw rectangles around areas you want to replace<br/>
                  • Image type: for replacing white spaces with images<br/>
                  • Text type: for replacing price or text areas
                </div>
              ) : (
                <div>
                  • Click on a rectangle to select it<br/>
                  • For Image areas: choose an image from the gallery below<br/>
                  • For Text areas: enter your text in the input field below
                </div>
              )}
            </div>

            {/* Canvas */}
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <canvas
                ref={canvasRef}
                className="max-w-full cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={(e) => {
                  if (!isAnnotationMode) {
                    // Check if clicking on a rectangle
                    const coords = getCanvasCoordinates(e);
                    const clickedRect = rectangles.find(rect => 
                      coords.x >= rect.x && coords.x <= rect.x + rect.width &&
                      coords.y >= rect.y && coords.y <= rect.y + rect.height
                    );
                    if (clickedRect) {
                      handleRectangleClick(clickedRect.id);
                    }
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rectangle List and Image Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Marked Areas */}
        <Card>
          <CardHeader>
            <CardTitle>Marked Areas ({rectangles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rectangles.length === 0 ? (
                <p className="text-muted-foreground">No areas marked yet. Use annotation mode to mark areas.</p>
              ) : (
                rectangles.map((rect, index) => (
                  <div
                    key={rect.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRectangle === rect.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleRectangleClick(rect.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {rect.type === 'text' ? '📝' : '🖼️'} Area {index + 1} ({rect.type})
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(rect.width)} × {Math.round(rect.height)} px
                        </div>
                        {rect.type === 'image' && rect.selectedImage && (
                          <div className="text-sm text-green-600">✓ Image assigned</div>
                        )}
                        {rect.type === 'text' && rect.text && (
                          <div className="text-sm text-green-600">✓ Text: "{rect.text}"</div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRectangle(rect.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Image Gallery */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedRectangle && rectangles.find(r => r.id === selectedRectangle)?.type === 'text' 
                ? 'Text Input' 
                : 'Replacement Images'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRectangle && rectangles.find(r => r.id === selectedRectangle)?.type === 'text' ? (
              // Text input section
              <div className="space-y-4">
                <div>
                  <Label htmlFor="text-input">Text Content</Label>
                  <Input
                    id="text-input"
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter text (e.g., $29.99)"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="font-size">Font Size</Label>
                    <input
                      id="font-size"
                      type="range"
                      min="12"
                      max="48"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-sm text-muted-foreground">{fontSize}px</span>
                  </div>
                  
                  <div>
                    <Label htmlFor="text-color">Text Color</Label>
                    <input
                      id="text-color"
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      className="w-full h-10 border rounded"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bg-color">Background Color</Label>
                  <input
                    id="bg-color"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full h-10 border rounded"
                  />
                </div>
                
                <Button
                  onClick={() => assignTextToRectangle(textInput)}
                  disabled={!textInput.trim()}
                  className="w-full"
                >
                  Assign Text to Area
                </Button>
              </div>
            ) : (
              // Image gallery section
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {(sheetImages.length > 0 ? sheetImages : REPLACEMENT_IMAGES).map((imageUrl, index) => (
                    <div
                      key={index}
                      className={`relative aspect-square border rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 ${
                        selectedRectangle && rectangles.find(r => r.id === selectedRectangle)?.type === 'image' 
                          ? 'hover:border-primary' 
                          : 'opacity-50'
                      }`}
                      onClick={() => {
                        const selectedRect = rectangles.find(r => r.id === selectedRectangle);
                        if (selectedRect?.type === 'image') {
                          assignImageToRectangle(imageUrl);
                        }
                      }}
                    >
                      <Image
                        src={imageUrl}
                        alt={`Replacement image ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                      {(!selectedRectangle || rectangles.find(r => r.id === selectedRectangle)?.type !== 'image') && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Select an image area first</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {sheetImages.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Upload a Google Sheet with an 'image' column to use custom images</p>
                    <p className="text-xs">Currently showing default images</p>
                  </div>
                )}
                {selectedRectangle && rectangles.find(r => r.id === selectedRectangle)?.type === 'image' && (
                  <p className="text-sm text-muted-foreground mt-3">
                    Click on an image to assign it to the selected area.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sheet Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Google Sheet for Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <div className="font-medium mb-2">Required Format:</div>
              <div className="text-muted-foreground">
                <div>• Must have a column named "image" (can be anywhere)</div>
                <div>• Each row should contain a valid image URL in the image column</div>
                <div>• Google Drive share links are automatically converted</div>
                <div>• Additional columns (name, price, etc.) are allowed</div>
                <div>• Supported formats: .csv, .xlsx, .xls</div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="sheet-upload">Select Google Sheet File</Label>
              <Input
                id="sheet-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleSheetUpload}
                disabled={isUploadingSheet}
              />
            </div>
            
            {isUploadingSheet && (
              <div className="text-center text-sm text-muted-foreground">
                Processing sheet...
              </div>
            )}
            
            {validationErrors.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="text-sm text-destructive font-medium">Validation Errors:</div>
                <div className="text-sm text-destructive mt-1">
                  {validationErrors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </div>
            )}
            
            {sheetImages.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-800 font-medium">
                  ✅ Sheet loaded successfully!
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Found {sheetImages.length} images ready for use.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 