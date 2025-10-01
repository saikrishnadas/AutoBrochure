"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Trash2, Square, Image as ImageIcon, FileSpreadsheet, X, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { validateProductSheet, validateProductSheetFromUrl, formatValidationErrors, type ProductData } from '@/lib/sheet-validation';
import * as XLSX from 'xlsx';
import { FontCustomizationModal, type FontSettings } from './font-customization-modal';

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
  offsetX?: number;
  offsetY?: number;
  imageScale?: number; // Scale factor for the image (1.0 = original size)
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
}

interface Point { x: number; y: number }

interface Polygon {
  id: string;
  points: Point[];
  selectedImage?: string;
  type: 'image' | 'text';
  text?: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  offsetX?: number;
  offsetY?: number;
  imageScale?: number; // Scale factor for the image (1.0 = original size)
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontWeight: string;
  textAlign: 'left' | 'center' | 'right';
}

interface ImageReplacerProps {
  templateUrl: string;
  title: string;
  onSave?: (regions: any[]) => void;
  predefinedRegions?: any[];
  isAdminMode?: boolean;
  isUserMode?: boolean;
}

const REPLACEMENT_IMAGES = [
  "/imagesToReplace/ChatGPT Image Jun 23, 2025, 08_54_26 PM.png",
  "/imagesToReplace/ChatGPT Image Jun 23, 2025, 08_54_29 PM.png",
  "/imagesToReplace/ChatGPT Image Jun 23, 2025, 08_54_30 PM.png",
  "/imagesToReplace/ChatGPT Image Jun 23, 2025, 08_54_31 PM.png",
  "/imagesToReplace/ChatGPT Image Jun 23, 2025, 08_54_32 PM.png"
];

export function ImageReplacer({ templateUrl, title, onSave, predefinedRegions, isAdminMode, isUserMode }: ImageReplacerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<Rectangle | null>(null);
  const [selectedRectangle, setSelectedRectangle] = useState<string | null>(null);
  const [selectedPolygon, setSelectedPolygon] = useState<string | null>(null);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [rectangleType, setRectangleType] = useState<'image' | 'text'>('image');
  const [annotationShape, setAnnotationShape] = useState<'rectangle' | 'polygon'>('rectangle');
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [currentPolygonPoints, setCurrentPolygonPoints] = useState<Point[]>([]);
  const [textInput, setTextInput] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [fontColor, setFontColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [productData, setProductData] = useState<ProductData[]>([]);
  const [isUploadingSheet, setIsUploadingSheet] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [hdScale, setHdScale] = useState<number>(2);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [previewScale, setPreviewScale] = useState(0.5);
  const [dragState, setDragState] = useState<{ kind: 'rect' | 'poly'; id: string } | null>(null);
  const [lastMouse, setLastMouse] = useState<{ x: number; y: number } | null>(null);
  const [selectedForZoom, setSelectedForZoom] = useState<{ kind: 'rect' | 'poly'; id: string } | null>(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isGeneratingFinal, setIsGeneratingFinal] = useState(false);
  const [showBgRemovalModal, setShowBgRemovalModal] = useState(false);
  const [selectedForBgRemoval, setSelectedForBgRemoval] = useState<Set<string>>(new Set());
  const [processingBgRemoval, setProcessingBgRemoval] = useState(false);
  const [bgRemovalProgress, setBgRemovalProgress] = useState(0);
  const [showFontModal, setShowFontModal] = useState(false);
  const [editingTextElement, setEditingTextElement] = useState<{ kind: 'rect' | 'poly' | 'floating'; id: string } | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [availableNames, setAvailableNames] = useState<string[]>([]);
  const [isTextPlacementMode, setIsTextPlacementMode] = useState(false);
  const [selectedTextToPlace, setSelectedTextToPlace] = useState('');
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [selectedFloatingText, setSelectedFloatingText] = useState<string | null>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [draggedTextId, setDraggedTextId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [justFinishedDragging, setJustFinishedDragging] = useState(false);

  // Load predefined regions for user mode OR admin mode editing existing template
  useEffect(() => {
    if (predefinedRegions && (isUserMode || isAdminMode)) {
      const rects = predefinedRegions
        .filter(r => !r.coordinates?.points) // Check coordinates.points for database format
        .map(r => ({
          id: r.id,
          x: r.coordinates?.x || r.x || 0,
          y: r.coordinates?.y || r.y || 0,
          width: r.coordinates?.width || r.width || 0,
          height: r.coordinates?.height || r.height || 0,
          type: r.type,
          selectedImage: undefined,
          text: undefined,
          fontSize: 16,
          fontColor: '#000000',
          backgroundColor: '#ffffff'
        }));
      
      const polys = predefinedRegions
        .filter(r => r.coordinates?.points || r.points) // Check both formats
        .map(r => ({
          id: r.id,
          points: r.coordinates?.points || r.points || [],
          type: r.type,
          selectedImage: undefined
        }));
      
      setRectangles(rects);
      setPolygons(polys);
      
      console.log('🔍 Loaded regions:', { rectangles: rects.length, polygons: polys.length });
    }
  }, [predefinedRegions, isUserMode, isAdminMode]);

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

  const drawRectangle = useCallback((
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
  }, [canvasScale, rectangles]);

  const drawPolygon = useCallback((
    ctx: CanvasRenderingContext2D,
    poly: Polygon,
    isSelected: boolean = false,
    isDrawing: boolean = false
  ) => {
    if (poly.points.length === 0) return;
    ctx.beginPath();
    const [first, ...rest] = poly.points;
    ctx.moveTo(first.x * canvasScale, first.y * canvasScale);
    rest.forEach(p => ctx.lineTo(p.x * canvasScale, p.y * canvasScale));
    if (!isDrawing) ctx.closePath();
    ctx.strokeStyle = isSelected ? '#ff00aa' : isDrawing ? '#00aa88' : '#a100ff';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash(isDrawing ? [6, 6] : []);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isSelected ? 'rgba(255, 0, 170, 0.12)' : 'rgba(161, 0, 255, 0.10)';
    if (!isDrawing) ctx.fill();

    // label near centroid
    const centroid = getPolygonCentroid(poly.points);
    ctx.fillStyle = isSelected ? '#ff00aa' : '#a100ff';
    ctx.font = '12px Arial';
    ctx.fillText('Polygon', centroid.x * canvasScale + 5, centroid.y * canvasScale + 5);
  }, [canvasScale]);

  const drawFloatingText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: FloatingText,
    isSelected: boolean = false
  ) => {
    const isBeingDragged = isDraggingText && draggedTextId === text.id;
    const x = text.x * canvasScale;
    const y = text.y * canvasScale;
    
    // Set up text styling
    ctx.fillStyle = text.fontColor;
    const fontWeight = text.fontWeight;
    const fontSize = text.fontSize * canvasScale;
    const fontFamily = text.fontFamily;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = text.textAlign;
    ctx.textBaseline = 'middle';
    
    // Draw background if specified
    if (text.backgroundColor && text.backgroundColor !== 'transparent') {
      const textWidth = ctx.measureText(text.text).width;
      const textHeight = fontSize;
      let bgX = x;
      
      if (text.textAlign === 'center') {
        bgX = x - textWidth / 2;
      } else if (text.textAlign === 'right') {
        bgX = x - textWidth;
      }
      
      ctx.fillStyle = text.backgroundColor;
      ctx.fillRect(bgX - 4, y - textHeight/2 - 2, textWidth + 8, textHeight + 4);
      ctx.fillStyle = text.fontColor; // Reset text color
    }
    
    // Draw text
    ctx.fillText(text.text, x, y);
    
    // Draw selection indicator or drag feedback
    if (isSelected || isBeingDragged) {
      const textWidth = ctx.measureText(text.text).width;
      const textHeight = fontSize;
      let selX = x;
      
      if (text.textAlign === 'center') {
        selX = x - textWidth / 2;
      } else if (text.textAlign === 'right') {
        selX = x - textWidth;
      }
      
      if (isBeingDragged) {
        // Show drag feedback - thicker blue border with shadow
        ctx.shadowColor = 'rgba(0, 0, 255, 0.3)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(selX - 6, y - textHeight/2 - 4, textWidth + 12, textHeight + 8);
        ctx.shadowBlur = 0;
      } else {
        // Regular selection indicator
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(selX - 4, y - textHeight/2 - 2, textWidth + 8, textHeight + 4);
        ctx.setLineDash([]);
      }
    }
  }, [canvasScale, isDraggingText, draggedTextId]);

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

    // Draw polygons
    polygons.forEach((poly) => {
      drawPolygon(ctx, poly, poly.id === selectedPolygon);
    });

    // Draw floating texts
    floatingTexts.forEach((text) => {
      drawFloatingText(ctx, text, text.id === selectedFloatingText);
    });

    // Draw current rectangle being drawn
    if (currentRect) {
      drawRectangle(ctx, currentRect, false, true);
    }
    // Draw current polygon path
    if (isDrawingPolygon && currentPolygonPoints.length > 0) {
      drawPolygon(ctx, { id: 'preview', points: currentPolygonPoints, type: 'image' }, false, true);
      ctx.fillStyle = '#00aa88';
      currentPolygonPoints.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x * canvasScale, p.y * canvasScale, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [rectangles, selectedRectangle, currentRect, drawRectangle, polygons, selectedPolygon, isDrawingPolygon, currentPolygonPoints, drawPolygon, canvasScale, floatingTexts, selectedFloatingText, drawFloatingText, isDraggingText, draggedTextId]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Preview modal canvas render
  useEffect(() => {
    if (!isPreviewOpen) return;
    renderPreviewCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewOpen, previewScale, rectangles, polygons, rectangleType, templateUrl]);

  // Keyboard shortcuts for zoom controls
  useEffect(() => {
    if (!isPreviewOpen || !selectedForZoom) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser behavior for these keys
      if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0') {
        e.preventDefault();
      }

      switch (e.key) {
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        case '0':
          resetZoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewOpen, selectedForZoom, zoomIn, zoomOut, resetZoom]);

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
    const coords = getCanvasCoordinates(event);
    
    // Check if clicking on floating text for dragging
    if (!isAnnotationMode && !isTextPlacementMode) {
      const clickedText = floatingTexts.find(text => {
        const textWidth = text.text.length * (text.fontSize * 0.6); // Approximate text width
        const textHeight = text.fontSize;
        return coords.x >= text.x - textWidth/2 && coords.x <= text.x + textWidth/2 &&
               coords.y >= text.y - textHeight/2 && coords.y <= text.y + textHeight/2;
      });
      
      if (clickedText) {
        setIsDraggingText(true);
        setDraggedTextId(clickedText.id);
        setSelectedFloatingText(clickedText.id);
        setDragOffset({
          x: coords.x - clickedText.x,
          y: coords.y - clickedText.y
        });
        return;
      }
    }
    
    if (!isAnnotationMode) return;

    if (annotationShape === 'rectangle') {
      setSelectedPolygon(null);
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
    } else {
      setSelectedRectangle(null);
      setIsDrawingPolygon(true);
      setCurrentPolygonPoints(prev => [...prev, coords]);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(event);
    
    // Handle text dragging
    if (isDraggingText && draggedTextId) {
      const newX = coords.x - dragOffset.x;
      const newY = coords.y - dragOffset.y;
      
      setFloatingTexts(prev => prev.map(text => 
        text.id === draggedTextId 
          ? { ...text, x: newX, y: newY }
          : text
      ));
      return;
    }
    
    if (annotationShape === 'rectangle') {
      if (!isDrawing || !startPoint) return;
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
    }
  };

  const handleMouseUp = () => {
    // Handle end of text dragging
    if (isDraggingText) {
      setIsDraggingText(false);
      setDraggedTextId(null);
      setDragOffset({ x: 0, y: 0 });
      setJustFinishedDragging(true);
      // Clear the flag after a short delay to prevent accidental clicks
      setTimeout(() => setJustFinishedDragging(false), 100);
      return;
    }
    
    if (annotationShape === 'rectangle') {
      if (!isDrawing || !currentRect) return;
      if (currentRect.width > 10 && currentRect.height > 10) {
        setRectangles(prev => [...prev, { ...currentRect, id: Date.now().toString() }]);
        toast.success("Area marked for replacement!");
      }
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentRect(null);
    }
  };

  const finishPolygon = () => {
    if (!isDrawingPolygon || currentPolygonPoints.length < 3) {
      toast.error('Polygon needs at least 3 points');
      return;
    }
    const id = Date.now().toString();
    setPolygons(prev => [...prev, { id, points: currentPolygonPoints, type: 'image' }]);
    setIsDrawingPolygon(false);
    setCurrentPolygonPoints([]);
    toast.success('Polygon marked for replacement!');
  };

  const handleRectangleClick = (rectId: string) => {
    if (isAnnotationMode) return;
    setSelectedPolygon(null);
    setSelectedRectangle(selectedRectangle === rectId ? null : rectId);
  };

  const handlePolygonClick = (polyId: string) => {
    if (isAnnotationMode) return;
    setSelectedRectangle(null);
    setSelectedPolygon(selectedPolygon === polyId ? null : polyId);
  };

  const assignImageToArea = (imageUrl: string) => {
    console.log('🖼️ Assigning image:', imageUrl);
    console.log('📍 Selected rectangle:', selectedRectangle);
    console.log('📍 Selected polygon:', selectedPolygon);
    
    if (selectedRectangle) {
      setRectangles(prev => {
        const updated = prev.map(rect => rect.id === selectedRectangle ? { ...rect, selectedImage: imageUrl } : rect);
        console.log('📦 Updated rectangles:', updated);
        return updated;
      });
      toast.success('Image assigned to rectangle!');
      return;
    }
    
    if (selectedPolygon) {
      setPolygons(prev => {
        const updated = prev.map(poly => poly.id === selectedPolygon ? { ...poly, selectedImage: imageUrl } : poly);
        console.log('🔺 Updated polygons:', updated);
        return updated;
      });
      toast.success('Image assigned to polygon!');
      return;
    }
    
    toast.error('Please select an area first!');
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

  const deletePolygon = (polyId: string) => {
    setPolygons(prev => prev.filter(poly => poly.id !== polyId));
    if (selectedPolygon === polyId) {
      setSelectedPolygon(null);
    }
    toast.success('Area deleted!');
  };

  const generateFinalImage = async () => {
    if (!canvasRef.current || !imageRef.current) return;
    
    console.log('🚀 GENERATE BUTTON CLICKED');
    console.log('📊 Current rectangles state:', rectangles.map(r => ({
      id: r.id.slice(0, 8),
      type: r.type,
      hasSelectedImage: !!r.selectedImage,
      selectedImage: r.selectedImage
    })));
    console.log('📊 Current polygons state:', polygons.map(p => ({
      id: p.id.slice(0, 8),
      type: p.type,
      hasSelectedImage: !!p.selectedImage,
      selectedImage: p.selectedImage
    })));

    setIsGeneratingFinal(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create a new canvas with original image dimensions
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) return;

      // HD scale rendering
      const baseW = imageRef.current.width;
      const baseH = imageRef.current.height;
      finalCanvas.width = Math.round(baseW * hdScale);
      finalCanvas.height = Math.round(baseH * hdScale);

      // Draw original template scaled
      finalCtx.drawImage(imageRef.current, 0, 0, finalCanvas.width, finalCanvas.height);

      // Replace areas with selected images or text
      console.log('🎨 Generating final image...');
      console.log('📦 All rectangles:', rectangles);
      console.log('🔺 All polygons:', polygons);
      
      for (const rect of rectangles) {
        console.log('🔍 Processing rectangle:', rect);
        if (rect.type === 'image' && rect.selectedImage) {
          console.log('✅ Rectangle has selected image:', rect.selectedImage);
          // Use background-removed image if available, otherwise optimized, otherwise original
          const imageUrl = bgRemovedCache.current.get(rect.selectedImage) || 
                          optimizedImageCache.current.get(rect.selectedImage) || 
                          rect.selectedImage;
          const img = await loadImage(imageUrl);

          drawImageCoverWithOffset(
            finalCtx,
            img,
            rect.x * hdScale,
            rect.y * hdScale,
            rect.width * hdScale,
            rect.height * hdScale,
            (rect.offsetX || 0) * hdScale,
            (rect.offsetY || 0) * hdScale,
            rect.imageScale || 1.0
          );
        } else if (rect.type === 'text' && rect.text) {
          // Draw background if specified
          if (rect.backgroundColor && rect.backgroundColor !== 'transparent') {
            finalCtx.fillStyle = rect.backgroundColor;
            finalCtx.fillRect(rect.x * hdScale, rect.y * hdScale, rect.width * hdScale, rect.height * hdScale);
          }

          // Set up text styling
          finalCtx.fillStyle = rect.fontColor || '#000000';
          const fontWeight = rect.fontWeight || 'normal';
          const fontSize = (rect.fontSize || 16) * hdScale;
          const fontFamily = rect.fontFamily || 'Arial';
          finalCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
          finalCtx.textAlign = rect.textAlign || 'center';
          finalCtx.textBaseline = 'middle';
          
          // Calculate text position based on alignment
          let textX = (rect.x + rect.width / 2) * hdScale; // default center
          if (rect.textAlign === 'left') {
            textX = (rect.x + 5) * hdScale;
          } else if (rect.textAlign === 'right') {
            textX = (rect.x + rect.width - 5) * hdScale;
          }
          const textY = (rect.y + rect.height / 2) * hdScale;
          
          finalCtx.fillText(rect.text, textX, textY);
        }
      }

      // Draw polygons with clipping
      for (const poly of polygons) {
        console.log('🔍 Processing polygon:', poly);
        if (poly.type === 'image' && poly.selectedImage) {
          console.log('✅ Polygon has selected image:', poly.selectedImage);
          // Use background-removed image if available, otherwise optimized, otherwise original
          const imageUrl = bgRemovedCache.current.get(poly.selectedImage) || 
                          optimizedImageCache.current.get(poly.selectedImage) || 
                          poly.selectedImage;
          const img = await loadImage(imageUrl);

          finalCtx.save();
          // Build path
          finalCtx.beginPath();
          poly.points.forEach((p, idx) => {
            const x = p.x * hdScale;
            const y = p.y * hdScale;
            if (idx === 0) finalCtx.moveTo(x, y); else finalCtx.lineTo(x, y);
          });
          finalCtx.closePath();
          finalCtx.clip();

          const bbox = getPolygonBoundingBox(poly.points);
          drawImageCoverWithOffset(
            finalCtx,
            img,
            bbox.x * hdScale,
            bbox.y * hdScale,
            bbox.width * hdScale,
            bbox.height * hdScale,
            (poly.offsetX || 0) * hdScale,
            (poly.offsetY || 0) * hdScale,
            poly.imageScale || 1.0
          );

          finalCtx.restore();
        } else if (poly.type === 'text' && poly.text) {
          // Draw text in polygon
          const bbox = getPolygonBoundingBox(poly.points);
          
          // Draw background if specified
          if (poly.backgroundColor && poly.backgroundColor !== 'transparent') {
            finalCtx.save();
            finalCtx.beginPath();
            poly.points.forEach((p, idx) => {
              const x = p.x * hdScale;
              const y = p.y * hdScale;
              if (idx === 0) finalCtx.moveTo(x, y); else finalCtx.lineTo(x, y);
            });
            finalCtx.closePath();
            finalCtx.fillStyle = poly.backgroundColor;
            finalCtx.fill();
            finalCtx.restore();
          }
          
          // Set up text styling
          finalCtx.fillStyle = poly.fontColor || '#000000';
          const fontWeight = poly.fontWeight || 'normal';
          const fontSize = (poly.fontSize || 16) * hdScale;
          const fontFamily = poly.fontFamily || 'Arial';
          finalCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
          finalCtx.textAlign = poly.textAlign || 'center';
          finalCtx.textBaseline = 'middle';
          
          // Calculate text position based on alignment
          let textX = (bbox.x + bbox.width / 2) * hdScale; // default center
          if (poly.textAlign === 'left') {
            textX = (bbox.x + 5) * hdScale;
          } else if (poly.textAlign === 'right') {
            textX = (bbox.x + bbox.width - 5) * hdScale;
          }
          
          finalCtx.fillText(poly.text, textX, (bbox.y + bbox.height / 2) * hdScale);
        }
      }

      // Draw floating texts
      for (const text of floatingTexts) {
        // Set up text styling
        finalCtx.fillStyle = text.fontColor;
        const fontWeight = text.fontWeight;
        const fontSize = text.fontSize * hdScale;
        const fontFamily = text.fontFamily;
        finalCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        finalCtx.textAlign = text.textAlign;
        finalCtx.textBaseline = 'middle';
        
        // Draw background if specified
        if (text.backgroundColor && text.backgroundColor !== 'transparent') {
          const textWidth = finalCtx.measureText(text.text).width;
          const textHeight = fontSize;
          let bgX = text.x * hdScale;
          
          if (text.textAlign === 'center') {
            bgX = text.x * hdScale - textWidth / 2;
          } else if (text.textAlign === 'right') {
            bgX = text.x * hdScale - textWidth;
          }
          
          finalCtx.fillStyle = text.backgroundColor;
          finalCtx.fillRect(bgX - 4, text.y * hdScale - textHeight/2 - 2, textWidth + 8, textHeight + 4);
          finalCtx.fillStyle = text.fontColor; // Reset text color
        }
        
        // Draw text
        finalCtx.fillText(text.text, text.x * hdScale, text.y * hdScale);
      }

      // Convert to blob and create download URL
      const blob = await new Promise<Blob>((resolve) => {
        finalCanvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
      });
      
      const url = URL.createObjectURL(blob);
      setEditedImageUrl(url);
      
      toast.success("Final image generated successfully!");

    } catch (error) {
      console.error('Error generating final image:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        rectanglesCount: rectangles.length,
        polygonsCount: polygons.length
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate final image: ${errorMessage}`);
    } finally {
      setIsGeneratingFinal(false);
    }
  };

  function drawImageCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, dx: number, dy: number, dWidth: number, dHeight: number) {
    const iw = image.width;
    const ih = image.height;
    if (!iw || !ih) return;
    const scale = Math.max(dWidth / iw, dHeight / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const sx = dx + (dWidth - sw) / 2;
    const sy = dy + (dHeight - sh) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, sx, sy, sw, sh);
  }

  function drawImageCoverWithOffset(ctx: CanvasRenderingContext2D, image: HTMLImageElement, dx: number, dy: number, dWidth: number, dHeight: number, offsetX: number = 0, offsetY: number = 0, imageScale: number = 1.0) {
    const iw = image.width;
    const ih = image.height;
    if (!iw || !ih) return;
    
    // Calculate base scale to cover the area
    const baseScale = Math.max(dWidth / iw, dHeight / ih);
    // Apply additional image scale
    const finalScale = baseScale * imageScale;
    
    const sw = iw * finalScale;
    const sh = ih * finalScale;
    const sx = dx + (dWidth - sw) / 2 + offsetX;
    const sy = dy + (dHeight - sh) / 2 + offsetY;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, sx, sy, sw, sh);
  }

  function getPolygonBoundingBox(points: Point[]) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const width = Math.max(...xs) - x;
    const height = Math.max(...ys) - y;
    return { x, y, width, height };
  }

  function getPolygonCentroid(points: Point[]) {
    const n = points.length;
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / n, y: sum.y / n };
  }

  function isPointInPolygon(point: Point, poly: Polygon) {
    let inside = false;
    for (let i = 0, j = poly.points.length - 1; i < poly.points.length; j = i++) {
      const xi = poly.points[i].x, yi = poly.points[i].y;
      const xj = poly.points[j].x, yj = poly.points[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi + 0.00001) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Constrain image offset to stay within rectangle boundaries
  function constrainImageOffset(rect: Rectangle, offsetX: number, offsetY: number): { x: number; y: number } {
    if (!rect.selectedImage) return { x: offsetX, y: offsetY };
    
    const scale = rect.imageScale || 1.0;
    
    // Calculate how much the image can move based on the scale
    // When scale > 1: image is larger than container, so it can move more
    // When scale = 1: image fits exactly, no movement allowed
    // When scale < 1: image is smaller than container, movement should be limited
    
    const rectWidth = rect.width;
    const rectHeight = rect.height;
    
    let maxOffsetX, maxOffsetY;
    
    if (scale >= 1.0) {
      // Image is same size or larger - can move within the "extra" space
      maxOffsetX = (rectWidth * (scale - 1)) / 2;
      maxOffsetY = (rectHeight * (scale - 1)) / 2;
    } else {
      // Image is smaller - limit movement to keep it within bounds
      // The smaller the scale, the less it should move
      maxOffsetX = (rectWidth * (1 - scale)) / 2;
      maxOffsetY = (rectHeight * (1 - scale)) / 2;
    }
    
    const constrainedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX));
    const constrainedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY));
    
    return { x: constrainedX, y: constrainedY };
  }

  // Constrain image offset for polygons
  function constrainImageOffsetForPolygon(bbox: { x: number; y: number; width: number; height: number }, offsetX: number, offsetY: number, scale: number): { x: number; y: number } {
    let maxOffsetX, maxOffsetY;
    
    if (scale >= 1.0) {
      // Image is same size or larger - can move within the "extra" space
      maxOffsetX = (bbox.width * (scale - 1)) / 2;
      maxOffsetY = (bbox.height * (scale - 1)) / 2;
    } else {
      // Image is smaller - limit movement to keep it within bounds
      maxOffsetX = (bbox.width * (1 - scale)) / 2;
      maxOffsetY = (bbox.height * (1 - scale)) / 2;
    }
    
    const constrainedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX));
    const constrainedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY));
    
    return { x: constrainedX, y: constrainedY };
  }

  // Zoom functions
  function zoomIn() {
    if (!selectedForZoom) return;
    
    if (selectedForZoom.kind === 'rect') {
      setRectangles(prev => prev.map(r => {
        if (r.id !== selectedForZoom.id) return r;
        const newScale = Math.min((r.imageScale || 1.0) + 0.1, 3.0); // Max 3x zoom
        // Recalculate constrained offset for new scale
        const constrainedOffset = constrainImageOffset(r, r.offsetX || 0, r.offsetY || 0);
        return { ...r, imageScale: newScale, offsetX: constrainedOffset.x, offsetY: constrainedOffset.y };
      }));
    } else {
      setPolygons(prev => prev.map(p => {
        if (p.id !== selectedForZoom.id) return p;
        const newScale = Math.min((p.imageScale || 1.0) + 0.1, 3.0); // Max 3x zoom
        const bbox = getPolygonBoundingBox(p.points);
        const constrainedOffset = constrainImageOffsetForPolygon(bbox, p.offsetX || 0, p.offsetY || 0, newScale);
        return { ...p, imageScale: newScale, offsetX: constrainedOffset.x, offsetY: constrainedOffset.y };
      }));
    }
    renderPreviewCanvas();
  }

  function zoomOut() {
    if (!selectedForZoom) return;
    
    if (selectedForZoom.kind === 'rect') {
      setRectangles(prev => prev.map(r => {
        if (r.id !== selectedForZoom.id) return r;
        const newScale = Math.max((r.imageScale || 1.0) - 0.1, 0.5); // Min 0.5x zoom
        // Recalculate constrained offset for new scale
        const constrainedOffset = constrainImageOffset(r, r.offsetX || 0, r.offsetY || 0);
        return { ...r, imageScale: newScale, offsetX: constrainedOffset.x, offsetY: constrainedOffset.y };
      }));
    } else {
      setPolygons(prev => prev.map(p => {
        if (p.id !== selectedForZoom.id) return p;
        const newScale = Math.max((p.imageScale || 1.0) - 0.1, 0.5); // Min 0.5x zoom
        const bbox = getPolygonBoundingBox(p.points);
        const constrainedOffset = constrainImageOffsetForPolygon(bbox, p.offsetX || 0, p.offsetY || 0, newScale);
        return { ...p, imageScale: newScale, offsetX: constrainedOffset.x, offsetY: constrainedOffset.y };
      }));
    }
    renderPreviewCanvas();
  }

  function resetZoom() {
    if (!selectedForZoom) return;
    
    if (selectedForZoom.kind === 'rect') {
      setRectangles(prev => prev.map(r => {
        if (r.id !== selectedForZoom.id) return r;
        return { ...r, imageScale: 1.0, offsetX: 0, offsetY: 0 };
      }));
    } else {
      setPolygons(prev => prev.map(p => {
        if (p.id !== selectedForZoom.id) return p;
        return { ...p, imageScale: 1.0, offsetX: 0, offsetY: 0 };
      }));
    }
    renderPreviewCanvas();
  }

  // Simple client-side background removal for near-white backgrounds
  async function removeWhiteBackground(dataUrl: string, tolerance: number = 18): Promise<string> {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    const off = document.createElement('canvas');
    const ctx = off.getContext('2d');
    if (!ctx) return dataUrl;
    off.width = img.width; off.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, off.width, off.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const isNearWhite = r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance;
      if (isNearWhite) d[i + 3] = 0;
    }
    ctx.putImageData(imageData, 0, 0);
    return off.toDataURL('image/png');
  }

  const handleProductSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSheet(true);
    setValidationErrors([]);

    try {
      const validationResult = await validateProductSheet(file);

            if (validationResult.isValid && validationResult.productData) {
              console.log('Product data loaded:', validationResult.productData);
              
              await processProductData(validationResult.productData);
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

  const handleGoogleSheetsUrlSubmit = async () => {
    if (!googleSheetsUrl.trim()) {
      toast.error('Please enter a Google Sheets URL');
      return;
    }

    setIsUploadingSheet(true);
    setValidationErrors([]);

    try {
      const validationResult = await validateProductSheetFromUrl(googleSheetsUrl.trim());

      if (validationResult.isValid && validationResult.productData) {
        console.log('Product data loaded from Google Sheets:', validationResult.productData);
        
        await processProductData(validationResult.productData);
        toast.success(`Google Sheets loaded! Found ${validationResult.productData.length} products.`);
      } else {
        setValidationErrors(validationResult.errors);
        toast.error('Google Sheets validation failed. Please check the format and permissions.');
      }
    } catch (error) {
      console.error('Error processing Google Sheets:', error);
      setValidationErrors(['Error processing the Google Sheets URL.']);
      toast.error('Failed to process Google Sheets. Please try again.');
    } finally {
      setIsUploadingSheet(false);
    }
  };

  const processProductData = async (productDataArray: ProductData[]) => {
    // Preload and optimize images
    setIsLoadingImages(true);
    const optimizedData = [...productDataArray];
    let processed = 0;
    
    try {
      for (let i = 0; i < optimizedData.length; i++) {
        const product = optimizedData[i];
        if (product.image) {
          // Check if already cached
          if (!optimizedImageCache.current.has(product.image)) {
            const optimizedUrl = await optimizeImage(product.image, 800, 800, 0.8);
            optimizedImageCache.current.set(product.image, optimizedUrl);
            // Preload the image
            await loadImage(optimizedUrl);
          }
          processed++;
          setLoadingProgress((processed / optimizedData.length) * 100);
        }
      }
    } catch (error) {
      console.error('Error preloading images:', error);
      toast.warning('Some images could not be optimized but will still be available.');
    } finally {
      setIsLoadingImages(false);
      setLoadingProgress(0);
    }
    
    setProductData(optimizedData);
    
    // Extract names for text elements
    const names = optimizedData.map(product => product.name);
    setAvailableNames(names);
    
    // Show background removal modal
    setShowBgRemovalModal(true);
  };

  // Font customization functions
  const openFontModal = (kind: 'rect' | 'poly' | 'floating', id: string) => {
    setEditingTextElement({ kind, id });
    
    if (kind === 'rect') {
      const rect = rectangles.find(r => r.id === id);
      if (rect) {
        setCurrentText(rect.text || '');
      }
    } else if (kind === 'poly') {
      const poly = polygons.find(p => p.id === id);
      if (poly) {
        setCurrentText(poly.text || '');
      }
    } else if (kind === 'floating') {
      const text = floatingTexts.find(t => t.id === id);
      if (text) {
        setCurrentText(text.text);
      }
    }
    
    setShowFontModal(true);
  };

  const handleFontSave = (fontSettings: FontSettings) => {
    if (!editingTextElement) return;

    if (editingTextElement.kind === 'rect') {
      setRectangles(prev => prev.map(r => {
        if (r.id !== editingTextElement.id) return r;
        return {
          ...r,
          text: currentText,
          fontFamily: fontSettings.fontFamily,
          fontSize: fontSettings.fontSize,
          fontWeight: fontSettings.fontWeight,
          fontColor: fontSettings.fontColor,
          backgroundColor: fontSettings.backgroundColor,
          textAlign: fontSettings.textAlign
        };
      }));
    } else if (editingTextElement.kind === 'poly') {
      setPolygons(prev => prev.map(p => {
        if (p.id !== editingTextElement.id) return p;
        return {
          ...p,
          text: currentText,
          fontFamily: fontSettings.fontFamily,
          fontSize: fontSettings.fontSize,
          fontWeight: fontSettings.fontWeight,
          fontColor: fontSettings.fontColor,
          backgroundColor: fontSettings.backgroundColor,
          textAlign: fontSettings.textAlign
        };
      }));
    } else if (editingTextElement.kind === 'floating') {
      setFloatingTexts(prev => prev.map(t => {
        if (t.id !== editingTextElement.id) return t;
        return {
          ...t,
          text: currentText,
          fontFamily: fontSettings.fontFamily,
          fontSize: fontSettings.fontSize,
          fontWeight: fontSettings.fontWeight,
          fontColor: fontSettings.fontColor,
          backgroundColor: fontSettings.backgroundColor,
          textAlign: fontSettings.textAlign
        };
      }));
    }
    
    renderPreviewCanvas();
    setEditingTextElement(null);
  };

  const getCurrentFontSettings = (): FontSettings => {
    if (!editingTextElement) {
      return {
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'normal',
        fontColor: '#000000',
        backgroundColor: 'transparent',
        textAlign: 'center'
      };
    }

    if (editingTextElement.kind === 'rect') {
      const rect = rectangles.find(r => r.id === editingTextElement.id);
      if (rect) {
        return {
          fontFamily: rect.fontFamily || 'Arial',
          fontSize: rect.fontSize || 16,
          fontWeight: rect.fontWeight || 'normal',
          fontColor: rect.fontColor || '#000000',
          backgroundColor: rect.backgroundColor || 'transparent',
          textAlign: rect.textAlign || 'center'
        };
      }
    } else if (editingTextElement.kind === 'poly') {
      const poly = polygons.find(p => p.id === editingTextElement.id);
      if (poly) {
        return {
          fontFamily: poly.fontFamily || 'Arial',
          fontSize: poly.fontSize || 16,
          fontWeight: poly.fontWeight || 'normal',
          fontColor: poly.fontColor || '#000000',
          backgroundColor: poly.backgroundColor || 'transparent',
          textAlign: poly.textAlign || 'center'
        };
      }
    } else if (editingTextElement.kind === 'floating') {
      const text = floatingTexts.find(t => t.id === editingTextElement.id);
      if (text) {
        return {
          fontFamily: text.fontFamily,
          fontSize: text.fontSize,
          fontWeight: text.fontWeight,
          fontColor: text.fontColor,
          backgroundColor: text.backgroundColor,
          textAlign: text.textAlign
        };
      }
    }

    return {
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'normal',
      fontColor: '#000000',
      backgroundColor: 'transparent',
      textAlign: 'center'
    };
  };

  function getPreviewCanvasSize() {
    const baseW = imageRef.current?.width || 0;
    const baseH = imageRef.current?.height || 0;
    return { w: Math.round(baseW * previewScale), h: Math.round(baseH * previewScale) };
  }

  async function renderPreviewCanvas() {
    if (!previewCanvasRef.current || !imageRef.current) return;
    console.log('🖼️ RENDERING PREVIEW CANVAS');
    console.log('📊 Preview rectangles:', rectangles.map(r => ({
      id: r.id.slice(0, 8),
      type: r.type,
      hasSelectedImage: !!r.selectedImage,
      selectedImage: r.selectedImage
    })));
    
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = getPreviewCanvasSize();
    canvas.width = w; canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(imageRef.current, 0, 0, w, h);

    // Draw rectangles
    for (const rect of rectangles) {
      console.log('🔍 Processing preview rectangle:', rect.id.slice(0, 8), 'hasImage:', !!rect.selectedImage);
      if (rect.type === 'image' && rect.selectedImage) {
        console.log('✅ Loading image for preview:', rect.selectedImage);
        try {
          // Use background-removed image if available, otherwise optimized, otherwise original
          const imageUrl = bgRemovedCache.current.get(rect.selectedImage) || 
                          optimizedImageCache.current.get(rect.selectedImage) || 
                          rect.selectedImage;
          const img = await loadImage(imageUrl);
          drawImageCoverWithOffset(ctx, img, rect.x * previewScale, rect.y * previewScale, rect.width * previewScale, rect.height * previewScale, (rect.offsetX || 0) * previewScale, (rect.offsetY || 0) * previewScale, rect.imageScale || 1.0);
        } catch (error) {
          console.error('❌ Failed to load image for preview, drawing placeholder:', error);
          // Draw a placeholder rectangle
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(rect.x * previewScale, rect.y * previewScale, rect.width * previewScale, rect.height * previewScale);
          ctx.strokeStyle = '#d1d5db';
          ctx.strokeRect(rect.x * previewScale, rect.y * previewScale, rect.width * previewScale, rect.height * previewScale);
          ctx.fillStyle = '#6b7280';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Image failed to load', (rect.x + rect.width / 2) * previewScale, (rect.y + rect.height / 2) * previewScale);
        }
      } else if (rect.type === 'text' && rect.text) {
        // Draw background if specified
        if (rect.backgroundColor && rect.backgroundColor !== 'transparent') {
          ctx.fillStyle = rect.backgroundColor;
          ctx.fillRect(rect.x * previewScale, rect.y * previewScale, rect.width * previewScale, rect.height * previewScale);
        }
        
        // Set up text styling
        ctx.fillStyle = rect.fontColor || '#000000';
        const fontWeight = rect.fontWeight || 'normal';
        const fontSize = (rect.fontSize || 16) * previewScale;
        const fontFamily = rect.fontFamily || 'Arial';
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = rect.textAlign || 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate text position based on alignment
        let textX = (rect.x + rect.width / 2) * previewScale; // default center
        if (rect.textAlign === 'left') {
          textX = (rect.x + 5) * previewScale;
        } else if (rect.textAlign === 'right') {
          textX = (rect.x + rect.width - 5) * previewScale;
        }
        
        ctx.fillText(rect.text, textX, (rect.y + rect.height / 2) * previewScale);
      }
    }

    // Draw polygons
    for (const poly of polygons) {
      if (poly.type === 'image' && poly.selectedImage) {
        try {
          // Use background-removed image if available, otherwise optimized, otherwise original
          const imageUrl = bgRemovedCache.current.get(poly.selectedImage) || 
                          optimizedImageCache.current.get(poly.selectedImage) || 
                          poly.selectedImage;
          const img = await loadImage(imageUrl);
          ctx.save();
          ctx.beginPath();
          poly.points.forEach((p, idx) => {
            const x = p.x * previewScale;
            const y = p.y * previewScale;
            if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.clip();
          const bbox = getPolygonBoundingBox(poly.points);
          drawImageCoverWithOffset(ctx, img, bbox.x * previewScale, bbox.y * previewScale, bbox.width * previewScale, bbox.height * previewScale, (poly.offsetX || 0) * previewScale, (poly.offsetY || 0) * previewScale, poly.imageScale || 1.0);
          ctx.restore();
        } catch (error) {
          console.error('❌ Failed to load image for polygon preview, drawing placeholder:', error);
          // Draw a placeholder polygon
          ctx.save();
          ctx.beginPath();
          poly.points.forEach((p, idx) => {
            const x = p.x * previewScale;
            const y = p.y * previewScale;
            if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fillStyle = '#f3f4f6';
          ctx.fill();
          ctx.strokeStyle = '#d1d5db';
          ctx.stroke();
          ctx.restore();
        }
      } else if (poly.type === 'text' && poly.text) {
        // Draw text in polygon
        const bbox = getPolygonBoundingBox(poly.points);
        
        // Draw background if specified
        if (poly.backgroundColor && poly.backgroundColor !== 'transparent') {
          ctx.save();
          ctx.beginPath();
          poly.points.forEach((p, idx) => {
            const x = p.x * previewScale;
            const y = p.y * previewScale;
            if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fillStyle = poly.backgroundColor;
          ctx.fill();
          ctx.restore();
        }
        
        // Set up text styling
        ctx.fillStyle = poly.fontColor || '#000000';
        const fontWeight = poly.fontWeight || 'normal';
        const fontSize = (poly.fontSize || 16) * previewScale;
        const fontFamily = poly.fontFamily || 'Arial';
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = poly.textAlign || 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate text position based on alignment
        let textX = (bbox.x + bbox.width / 2) * previewScale; // default center
        if (poly.textAlign === 'left') {
          textX = (bbox.x + 5) * previewScale;
        } else if (poly.textAlign === 'right') {
          textX = (bbox.x + bbox.width - 5) * previewScale;
        }
        
        ctx.fillText(poly.text, textX, (bbox.y + bbox.height / 2) * previewScale);
      }
    }

    // Draw floating texts
    for (const text of floatingTexts) {
      // Set up text styling
      ctx.fillStyle = text.fontColor;
      const fontWeight = text.fontWeight;
      const fontSize = text.fontSize * previewScale;
      const fontFamily = text.fontFamily;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = text.textAlign;
      ctx.textBaseline = 'middle';
      
      // Draw background if specified
      if (text.backgroundColor && text.backgroundColor !== 'transparent') {
        const textWidth = ctx.measureText(text.text).width;
        const textHeight = fontSize;
        let bgX = text.x * previewScale;
        
        if (text.textAlign === 'center') {
          bgX = text.x * previewScale - textWidth / 2;
        } else if (text.textAlign === 'right') {
          bgX = text.x * previewScale - textWidth;
        }
        
        ctx.fillStyle = text.backgroundColor;
        ctx.fillRect(bgX - 4, text.y * previewScale - textHeight/2 - 2, textWidth + 8, textHeight + 4);
        ctx.fillStyle = text.fontColor; // Reset text color
      }
      
      // Draw text
      ctx.fillText(text.text, text.x * previewScale, text.y * previewScale);
    }
  }

  // Image compression and optimization function
  async function optimizeImage(src: string, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.85): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const img = await loadImage(src);
        
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        // Only resize if image is larger than max dimensions
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
        
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        
        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to optimized blob
        canvas.toBlob((blob) => {
          if (blob) {
            const optimizedUrl = URL.createObjectURL(blob);
            console.log(`✅ Image optimized: ${img.width}x${img.height} → ${width}x${height}, Quality: ${quality}`);
            resolve(optimizedUrl);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', quality);
        
      } catch (error) {
        console.error('Failed to optimize image:', {
          src,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Fall back to original image if optimization fails
        resolve(src);
      }
    });
  }

  // Background removal function
  async function removeBackground(imageUrl: string): Promise<string> {
    try {
      // Dynamic import to avoid SSR issues
      const { removeBackground } = await import('@imgly/background-removal');
      
      console.log('🎨 Removing background from:', imageUrl);
      
      // Remove background
      const blob = await removeBackground(imageUrl, {
        model: 'isnet', // Options: 'isnet' (best quality), 'isnet_fp16' (balanced), 'isnet_quint8' (fastest)
        output: {
          format: 'image/png',
          quality: 1
        },
        progress: (key, current, total) => {
          console.log(`Background removal progress: ${key} ${current}/${total}`);
        }
      });
      
      // Convert blob to URL
      const bgRemovedUrl = URL.createObjectURL(blob);
      console.log('✅ Background removed successfully');
      
      return bgRemovedUrl;
    } catch (error) {
      console.error('Failed to remove background:', {
        imageUrl,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // Return original image if background removal fails
      return imageUrl;
    }
  }

  // Cache for loaded and optimized images
  const imageCache = useRef(new Map<string, HTMLImageElement>());
  const optimizedImageCache = useRef(new Map<string, string>());
  const bgRemovedCache = useRef(new Map<string, string>());

  // Cleanup optimized image URLs on unmount
  useEffect(() => {
    return () => {
      // Revoke all optimized image URLs to free memory
      optimizedImageCache.current.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      // Revoke all background removed image URLs
      bgRemovedCache.current.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  // Helper function to convert Google Drive URLs to direct image URLs
  function convertGoogleDriveUrl(url: string): string {
    // Pattern for drive.google.com/uc?export=view&id=...
    const ucPattern = /drive\.google\.com\/uc\?export=view&id=([a-zA-Z0-9_-]+)/;
    // Pattern for drive.google.com/open?id=...
    const openPattern = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
    // Pattern for drive.google.com/file/d/.../view
    const filePattern = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    
    let fileId = null;
    
    if (ucPattern.test(url)) {
      fileId = url.match(ucPattern)?.[1];
    } else if (openPattern.test(url)) {
      fileId = url.match(openPattern)?.[1];
    } else if (filePattern.test(url)) {
      fileId = url.match(filePattern)?.[1];
    }
    
    if (fileId) {
      // Use the direct download URL which sometimes works better
      // Alternative: `https://drive.google.com/uc?export=download&id=${fileId}`
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    
    return url;
  }

  function loadImage(src: string): Promise<HTMLImageElement> {
    // Check cache first
    if (imageCache.current.has(src)) {
      console.log('✅ Image loaded from cache:', src);
      return Promise.resolve(imageCache.current.get(src)!);
    }

    // Convert Google Drive URLs to a more compatible format
    const originalSrc = src;
    src = convertGoogleDriveUrl(src);
    if (src !== originalSrc) {
      console.log('🔄 Converted Google Drive URL:', originalSrc, '→', src);
    }

    return new Promise((resolve, reject) => {
      let attemptCount = 0;
      const maxAttempts = 4; // Increased to allow for Google Drive specific attempt
      
      const tryLoadImage = () => {
        const img = document.createElement('img');
        
        // Configure CORS based on attempt
        let imageSrc = src;
        
        if (src.startsWith('http')) {
          if (attemptCount === 0) {
            // First attempt: try with CORS
            img.crossOrigin = 'anonymous';
            console.log(`🔄 Attempt ${attemptCount + 1}: Loading with CORS enabled:`, src);
          } else if (attemptCount === 1) {
            // Second attempt: try without CORS
            // Don't set crossOrigin at all
            console.log(`🔄 Attempt ${attemptCount + 1}: Loading without CORS:`, src);
          } else if (attemptCount === 2) {
            // Third attempt: Use our own proxy endpoint
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(originalSrc)}`;
            imageSrc = proxyUrl;
            // Don't need CORS for our own endpoint
            console.log(`🔄 Attempt ${attemptCount + 1}: Loading via internal proxy:`, proxyUrl);
          } else if (attemptCount === 3) {
            // Fourth attempt: try external proxy services
            if (originalSrc.includes('drive.google.com')) {
              // Try a different proxy that might work better with Google Drive
              const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(src)}`;
              imageSrc = proxyUrl;
              img.crossOrigin = 'anonymous';
              console.log(`🔄 Attempt ${attemptCount + 1}: Loading via weserv.nl proxy:`, proxyUrl);
            } else {
              // For non-Google Drive URLs, use allorigins proxy
              const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`;
              imageSrc = proxyUrl;
              img.crossOrigin = 'anonymous';
              console.log(`🔄 Attempt ${attemptCount + 1}: Loading via allorigins proxy:`, proxyUrl);
            }
          }
        }
        
        img.onload = () => {
          console.log('✅ Image loaded successfully:', imageSrc);
          // Cache using the original source URL
          imageCache.current.set(originalSrc, img);
          resolve(img);
        };
        
        img.onerror = () => {
          attemptCount++;
          
          if (attemptCount < maxAttempts && src.startsWith('http')) {
            console.warn(`⚠️ Attempt ${attemptCount} failed for:`, imageSrc);
            // Try again with different CORS settings
            setTimeout(tryLoadImage, 100); // Small delay to avoid rapid retries
          } else {
            console.error('❌ All attempts failed to load image:', originalSrc);
            // Provide specific tips based on the URL type
            if (originalSrc.includes('drive.google.com')) {
              console.error('💡 Google Drive Tip: Consider making the image publicly accessible or downloading it to use locally. Google Drive has strict CORS policies.');
              // Show a user-friendly toast notification
              toast.error('Google Drive images may not load properly. Try downloading the image and re-uploading it.');
            } else if (src.startsWith('http')) {
              console.error('💡 Tip: External images may be blocked by CORS. Consider using a proxy service or downloading images locally.');
              toast.error('External image failed to load. Consider downloading it locally.');
            }
            reject(new Error(`Failed to load image after ${attemptCount} attempts: ${originalSrc}`));
          }
        };
        
        // Set the source to trigger loading
        img.src = imageSrc;
      };
      
      tryLoadImage();
    });
  }

  function handlePreviewMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!previewCanvasRef.current) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLastMouse({ x, y });
    // Select nearest placed area (rect or polygon) under cursor based on path
    const hitRect = rectangles.find(r => x >= r.x * previewScale && x <= (r.x + r.width) * previewScale && y >= r.y * previewScale && y <= (r.y + r.height) * previewScale && r.selectedImage);
    if (hitRect) { 
      setDragState({ kind: 'rect', id: hitRect.id }); 
      setSelectedForZoom({ kind: 'rect', id: hitRect.id });
      return; 
    }
    // polygon hit-test
    const pt: Point = { x: x / previewScale, y: y / previewScale };
    const hitPoly = polygons.find(p => p.selectedImage && isPointInPolygon(pt, p));
    if (hitPoly) { 
      setDragState({ kind: 'poly', id: hitPoly.id }); 
      setSelectedForZoom({ kind: 'poly', id: hitPoly.id });
      return; 
    }
    setDragState(null);
    setSelectedForZoom(null);
  }

  function handlePreviewMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!previewCanvasRef.current || !dragState || !lastMouse) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - lastMouse.x;
    const dy = y - lastMouse.y;
    setLastMouse({ x, y });
    const offX = dx / previewScale; // Convert to actual coordinates
    const offY = dy / previewScale;
    
    if (dragState.kind === 'rect') {
      setRectangles(prev => prev.map(r => {
        if (r.id !== dragState.id) return r;
        
        const newOffsetX = (r.offsetX || 0) + offX;
        const newOffsetY = (r.offsetY || 0) + offY;
        
        // Constrain dragging within annotation boundaries
        const constrainedOffset = constrainImageOffset(r, newOffsetX, newOffsetY);
        
        return { ...r, offsetX: constrainedOffset.x, offsetY: constrainedOffset.y };
      }));
    } else {
      setPolygons(prev => prev.map(p => {
        if (p.id !== dragState.id) return p;
        
        const newOffsetX = (p.offsetX || 0) + offX;
        const newOffsetY = (p.offsetY || 0) + offY;
        
        // Constrain dragging within polygon boundaries
        const bbox = getPolygonBoundingBox(p.points);
        const constrainedOffset = constrainImageOffsetForPolygon(bbox, newOffsetX, newOffsetY, p.imageScale || 1.0);
        
        return { ...p, offsetX: constrainedOffset.x, offsetY: constrainedOffset.y };
      }));
    }
    renderPreviewCanvas();
  }

  function handlePreviewMouseUp() {
    setDragState(null);
    setLastMouse(null);
  }

  const processBackgroundRemoval = async () => {
    if (selectedForBgRemoval.size === 0) {
      toast.info('No images selected for background removal');
      setShowBgRemovalModal(false);
      return;
    }

    setProcessingBgRemoval(true);
    setBgRemovalProgress(0);

    try {
      let processed = 0;
      const updatedData = [...productData];

      for (let i = 0; i < updatedData.length; i++) {
        const product = updatedData[i];
        
        if (product.image && selectedForBgRemoval.has(product.id)) {
          // Get the optimized image URL if available
          const imageUrl = optimizedImageCache.current.get(product.image) || product.image;
          
          // Check if we already have a background-removed version
          if (!bgRemovedCache.current.has(imageUrl)) {
            const bgRemovedUrl = await removeBackground(imageUrl);
            bgRemovedCache.current.set(product.image, bgRemovedUrl);
            
            // Update the optimized cache to use the bg-removed version
            optimizedImageCache.current.set(product.image, bgRemovedUrl);
          }
          
          processed++;
          setBgRemovalProgress((processed / selectedForBgRemoval.size) * 100);
        }
      }

      toast.success(`Background removed from ${selectedForBgRemoval.size} image${selectedForBgRemoval.size > 1 ? 's' : ''}`);
      setShowBgRemovalModal(false);
      setSelectedForBgRemoval(new Set());
      
    } catch (error) {
      console.error('Error processing background removal:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        selectedCount: selectedForBgRemoval.size
      });
      toast.error('Failed to remove background from some images');
    } finally {
      setProcessingBgRemoval(false);
      setBgRemovalProgress(0);
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
              {isAdminMode && (
                <Button
                  onClick={() => setIsAnnotationMode(!isAnnotationMode)}
                  variant={isAnnotationMode ? "default" : "outline"}
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  {isAnnotationMode ? "Exit Annotation Mode" : "Start Annotation Mode"}
                </Button>
              )}

              {isAnnotationMode && isAdminMode && (
                <>
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
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Shape:</label>
                    <select 
                      value={annotationShape}
                      onChange={(e) => setAnnotationShape(e.target.value as 'rectangle' | 'polygon')}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="polygon">Polygon</option>
                    </select>
                  </div>
                  {annotationShape === 'polygon' && (
                    <Button onClick={finishPolygon} variant="outline">Finish Polygon</Button>
                  )}
                </>
              )}
              
              {isAdminMode && (
                <Button
                  onClick={() => {
                    const allRegions = [
                      ...rectangles.map(r => ({
                        id: r.id,
                        x: r.x,
                        y: r.y,
                        width: r.width,
                        height: r.height,
                        type: r.type
                      })),
                      ...polygons.map(p => ({
                        id: p.id,
                        points: p.points,
                        type: p.type
                      }))
                    ];
                    onSave?.(allRegions);
                  }}
                  disabled={rectangles.length === 0 && polygons.length === 0}
                  variant="default"
                >
                  Save Template
                </Button>
              )}
              
              {isUserMode && (
                <Button
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={isGeneratingFinal || !(rectangles.some(r => r.type === 'image' && r.selectedImage) || polygons.some(p => p.selectedImage) || rectangles.some(r => r.type === 'text' && r.text && r.text.trim()))}
                  variant="default"
                >
                  {isGeneratingFinal ? 'Generating...' : 'Generate Image'}
                </Button>
              )}
              
              <Button
                onClick={downloadImage}
                disabled={!editedImageUrl}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">HD Scale:</label>
                <select
                  value={hdScale}
                  onChange={(e) => setHdScale(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                </select>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              <div className="font-medium mb-1">Instructions:</div>
              {isAnnotationMode ? (
                <div>
                  • Select "Image" or "Text" type before drawing<br/>
                  • Choose Rectangle or Polygon. For polygon: click to add points, then click "Finish Polygon"<br/>
                  • Draw areas you want to replace. Images will keep aspect ratio and fill the shape<br/>
                  • Text type: for replacing price or text areas
                </div>
              ) : (
                <div>
                  • Click on an area to select it<br/>
                  • For Image areas: choose an image from the gallery below<br/>
                  • For Text areas: enter your text in the input field below
                </div>
              )}
            </div>

            {/* Canvas */}
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <canvas
                ref={canvasRef}
                className={`max-w-full ${
                  isDraggingText ? 'cursor-grabbing' : 
                  isTextPlacementMode ? 'cursor-crosshair' : 
                  floatingTexts.length > 0 ? 'cursor-grab' :
                  'cursor-crosshair'
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={(e) => {
                  // Don't handle click if we just finished dragging
                  if (isDraggingText || justFinishedDragging) return;
                  
                  if (isTextPlacementMode && selectedTextToPlace) {
                    // Place text at clicked position
                    const coords = getCanvasCoordinates(e);
                    const newText: FloatingText = {
                      id: `text-${Date.now()}`,
                      x: coords.x,
                      y: coords.y,
                      text: selectedTextToPlace,
                      fontSize: 16,
                      fontColor: '#000000',
                      backgroundColor: 'transparent',
                      fontFamily: 'Arial',
                      fontWeight: 'normal',
                      textAlign: 'center'
                    };
                    setFloatingTexts(prev => [...prev, newText]);
                    setIsTextPlacementMode(false);
                    setSelectedTextToPlace('');
                    redrawCanvas();
                    toast.success(`Text "${selectedTextToPlace}" placed successfully!`);
                  } else if (!isAnnotationMode) {
                    const coords = getCanvasCoordinates(e);
                    
                    // Check if clicked on floating text
                    const clickedText = floatingTexts.find(text => {
                      const textWidth = text.text.length * (text.fontSize * 0.6); // Approximate text width
                      const textHeight = text.fontSize;
                      return coords.x >= text.x - textWidth/2 && coords.x <= text.x + textWidth/2 &&
                             coords.y >= text.y - textHeight/2 && coords.y <= text.y + textHeight/2;
                    });
                    
                    if (clickedText) {
                      setSelectedFloatingText(clickedText.id);
                      return;
                    }
                    
                    const clickedRect = rectangles.find(rect => 
                      coords.x >= rect.x && coords.x <= rect.x + rect.width &&
                      coords.y >= rect.y && coords.y <= rect.y + rect.height
                    );
                    if (clickedRect) {
                      handleRectangleClick(clickedRect.id);
                      return;
                    }
                    const clickedPoly = polygons.find(poly => isPointInPolygon(coords, poly));
                    if (clickedPoly) {
                      handlePolygonClick(clickedPoly.id);
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
            <CardTitle>Marked Areas ({rectangles.length + polygons.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rectangles.length === 0 && polygons.length === 0 ? (
                <p className="text-muted-foreground">No areas marked yet. Use annotation mode to mark areas.</p>
              ) : (
                <>
                {rectangles.map((rect, index) => (
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
                          <div className="text-sm text-green-600">✓ Text: &quot;{rect.text}&quot;</div>
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
                ))}
                {polygons.map((poly, pIndex) => (
                  <div
                    key={poly.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPolygon === poly.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handlePolygonClick(poly.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {poly.type === 'text' ? '📝' : '🖼️'} Polygon {pIndex + 1} ({poly.type})
                        </div>
                        <div className="text-sm text-muted-foreground">{poly.points.length} points</div>
                        {poly.type === 'image' && poly.selectedImage && (
                          <div className="text-sm text-green-600">✓ Image assigned</div>
                        )}
                        {poly.type === 'text' && poly.text && (
                          <div className="text-sm text-green-600">✓ Text: "{poly.text}"</div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {poly.type === 'text' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFontModal('poly', poly.id);
                            }}
                          >
                            Font
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePolygon(poly.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Floating Text Management */}
        <Card>
          <CardHeader>
            <CardTitle>Text Placement ({floatingTexts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Text Placement Controls */}
              {availableNames.length > 0 && (
                <div className="space-y-2">
                  <Label>Quick Place Names</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableNames.map((name, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTextToPlace(name);
                          setIsTextPlacementMode(true);
                          toast.info(`Click anywhere on the template to place "${name}"`);
                        }}
                        className="text-xs"
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Text Placement */}
              <div className="space-y-2">
                <Label htmlFor="custom-text">Custom Text</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-text"
                    placeholder="Enter custom text..."
                    value={selectedTextToPlace}
                    onChange={(e) => setSelectedTextToPlace(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      if (selectedTextToPlace.trim()) {
                        setIsTextPlacementMode(true);
                        toast.info(`Click anywhere on the template to place "${selectedTextToPlace}"`);
                      }
                    }}
                    disabled={!selectedTextToPlace.trim()}
                    size="sm"
                  >
                    Place
                  </Button>
                </div>
              </div>

              {isTextPlacementMode && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    📍 Click anywhere on the template to place: <strong>"{selectedTextToPlace}"</strong>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsTextPlacementMode(false);
                      setSelectedTextToPlace('');
                    }}
                    className="mt-2"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Floating Text List */}
              <div className="space-y-2">
                <Label>Placed Texts</Label>
                {floatingTexts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No texts placed yet.</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      💡 Click and drag any text on the canvas to reposition it
                    </p>
                  <div className="space-y-2">
                    {floatingTexts.map((text, index) => (
                      <div
                        key={text.id}
                        className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                          selectedFloatingText === text.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedFloatingText(text.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">📝 {text.text}</div>
                            <div className="text-xs text-muted-foreground">
                              Position: ({Math.round(text.x)}, {Math.round(text.y)})
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openFontModal('floating', text.id);
                              }}
                            >
                              Font
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFloatingTexts(prev => prev.filter(t => t.id !== text.id));
                                if (selectedFloatingText === text.id) {
                                  setSelectedFloatingText(null);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </div>
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
                {/* Quick Name Selection */}
                {availableNames.length > 0 && (
                  <div>
                    <Label htmlFor="name-select">Quick Select Name</Label>
                    <select
                      id="name-select"
                      className="w-full p-2 border rounded-md"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setTextInput(e.target.value);
                          assignTextToRectangle(e.target.value);
                        }
                      }}
                    >
                      <option value="">Select a name from your sheet...</option>
                      {availableNames.map((name, index) => (
                        <option key={index} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <Label htmlFor="text-input">Text Content</Label>
                  <Input
                    id="text-input"
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter text or select a name above"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => assignTextToRectangle(textInput)}
                    disabled={!textInput.trim()}
                    className="flex-1"
                  >
                    Assign Text
                  </Button>
                  <Button
                    onClick={() => openFontModal('rect', selectedRectangle)}
                    variant="outline"
                    className="flex-1"
                  >
                    Customize Font
                  </Button>
                </div>
              </div>
            ) : (
              // Image gallery section
              <div>
                {productData.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {productData.map((product) => (
                      <div
                        key={product.id}
                        className={`relative aspect-square border rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 ${
                          (selectedRectangle && rectangles.find(r => r.id === selectedRectangle)?.type === 'image') || (selectedPolygon && polygons.find(p => p.id === selectedPolygon)) 
                            ? 'hover:border-primary' 
                            : 'opacity-50'
                        }`}
                        onClick={() => {
                          const selectedRect = rectangles.find(r => r.id === selectedRectangle);
                          const selectedPoly = polygons.find(p => p.id === selectedPolygon);
                          if ((selectedRect?.type === 'image') || selectedPoly) {
                            assignImageToArea(product.image);
                          }
                        }}
                      >
                        <div className="relative w-full h-full bg-gray-200 flex items-center justify-center">
                          {/* Fallback to regular img tag for debugging */}
                          <img
                            src={bgRemovedCache.current.get(product.image) || optimizedImageCache.current.get(product.image) || product.image}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image failed to load:', product.image, e);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              // Show error message in the loading div
                              const parent = target.parentElement;
                              const loadingDiv = parent?.querySelector('.loading-text') as HTMLElement;
                              if (loadingDiv) {
                                loadingDiv.textContent = 'Failed to load';
                                loadingDiv.classList.add('text-red-500');
                              }
                            }}
                            onLoad={(e) => {
                              console.log('Image loaded successfully:', product.image);
                              // Hide loading text when image loads
                              const target = e.target as HTMLImageElement;
                              const parent = target.parentElement;
                              const loadingDiv = parent?.querySelector('.loading-text') as HTMLElement;
                              if (loadingDiv) {
                                loadingDiv.style.display = 'none';
                              }
                            }}
                          />
                          <div className="loading-text absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
                            Loading...
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                          <p className="text-xs font-medium truncate">{product.name}</p>
                          <p className="text-xs text-gray-300">ID: {product.id}</p>
                        </div>
                        {(!selectedRectangle && !selectedPolygon) || (selectedRectangle && rectangles.find(r => r.id === selectedRectangle)?.type !== 'image') && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">Select an image area first</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {REPLACEMENT_IMAGES.map((imageUrl, index) => (
                      <div
                        key={index}
                        className={`relative aspect-square border rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 ${
                          (selectedRectangle && rectangles.find(r => r.id === selectedRectangle)?.type === 'image') || (selectedPolygon && polygons.find(p => p.id === selectedPolygon)) 
                            ? 'hover:border-primary' 
                            : 'opacity-50'
                        }`}
                        onClick={() => {
                          const selectedRect = rectangles.find(r => r.id === selectedRectangle);
                          const selectedPoly = polygons.find(p => p.id === selectedPolygon);
                          if ((selectedRect?.type === 'image') || selectedPoly) {
                            assignImageToArea(imageUrl);
                          }
                        }}
                      >
                        <Image
                          src={imageUrl}
                          alt={`Default image ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        {(!selectedRectangle && !selectedPolygon) || (selectedRectangle && rectangles.find(r => r.id === selectedRectangle)?.type !== 'image') && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">Select an image area first</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-3 space-y-4">
                  <div>
                    <Label>Product Data Source</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant={uploadMethod === 'file' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUploadMethod('file')}
                        disabled={isUploadingSheet}
                      >
                        Upload File
                      </Button>
                      <Button
                        type="button"
                        variant={uploadMethod === 'url' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUploadMethod('url')}
                        disabled={isUploadingSheet}
                      >
                        Google Sheets URL
                      </Button>
                    </div>
                  </div>

                  {uploadMethod === 'file' ? (
                    <div>
                      <Label htmlFor="product-sheet-upload">Upload Product Sheet</Label>
                      <Input 
                        id="product-sheet-upload" 
                        type="file" 
                        accept=".csv,.xlsx,.xls" 
                        onChange={handleProductSheetUpload} 
                        disabled={isUploadingSheet}
                      />
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        <div><strong>Required format:</strong></div>
                        <div>• Columns: name, id, image</div>
                        <div>• Maximum 5 rows of data</div>
                        <div>• Google Drive links auto-converted</div>
                        <div>• Supported: .csv, .xlsx, .xls</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="google-sheets-url">Google Sheets URL</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="google-sheets-url"
                          type="url"
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          value={googleSheetsUrl}
                          onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                          disabled={isUploadingSheet}
                        />
                        <Button
                          type="button"
                          onClick={handleGoogleSheetsUrlSubmit}
                          disabled={isUploadingSheet || !googleSheetsUrl.trim()}
                          size="sm"
                        >
                          Load
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        <div><strong>Requirements:</strong></div>
                        <div>• Sheet must be publicly accessible</div>
                        <div>• Columns: name, id, image</div>
                        <div>• Maximum 5 rows of data</div>
                        <div>• Google Drive image links auto-converted</div>
                        <div><strong>Tip:</strong> Share your sheet with "Anyone with the link can view"</div>
                      </div>
                    </div>
                  )}
                </div>

                {productData.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Upload a product sheet to use custom images</p>
                    <p className="text-xs">Currently showing default images</p>
                  </div>
                )}
                
                {(selectedRectangle && rectangles.find(r => r.id === selectedRectangle)?.type === 'image') || selectedPolygon ? (
                  <p className="text-sm text-muted-foreground mt-3">
                    Click on a product image to assign it to the selected area.
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Sheet Status */}
      {isUploadingSheet && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-sm text-muted-foreground">
              Processing product sheet...
            </div>
          </CardContent>
        </Card>
      )}
      
      {validationErrors.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="text-sm text-destructive font-medium">Sheet Validation Errors:</div>
              <div className="text-sm text-destructive mt-1">
                {validationErrors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Loading Progress */}
      {isLoadingImages && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="text-sm font-medium">Optimizing Images...</div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This process optimizes images for better performance while maintaining quality.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {productData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800 font-medium">
                ✅ Product sheet loaded successfully!
              </div>
              <div className="text-sm text-green-700 mt-1">
                Found {productData.length} products ready for use.
              </div>
              <div className="text-xs text-green-600 mt-2">
                Products: {productData.map(p => p.name).join(', ')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold">Adjust Placement & Preview</div>
              <div className="flex items-center gap-3">
                <label className="text-sm">Preview Scale</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={previewScale}
                  onChange={(e) => setPreviewScale(Number(e.target.value))}
                >
                  <option value={0.25}>25%</option>
                  <option value={0.5}>50%</option>
                  <option value={0.75}>75%</option>
                  <option value={1}>100%</option>
                </select>
                <Button variant="ghost" onClick={() => setIsPreviewOpen(false)}>Close</Button>
              </div>
            </div>
            <div className="p-4 overflow-hidden flex-1">
              <div className="w-full h-full overflow-auto border rounded max-h-[60vh]">
                <canvas
                  ref={previewCanvasRef}
                  className="block max-w-full"
                  onMouseDown={(e) => handlePreviewMouseDown(e)}
                  onMouseMove={(e) => handlePreviewMouseMove(e)}
                  onMouseUp={() => handlePreviewMouseUp()}
                  onMouseLeave={() => handlePreviewMouseUp()}
                />
              </div>
              
              {/* Zoom Controls */}
              {selectedForZoom && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      Selected: {selectedForZoom.kind === 'rect' ? 'Rectangle' : 'Polygon'} 
                      {selectedForZoom.kind === 'rect' 
                        ? ` (Scale: ${((rectangles.find(r => r.id === selectedForZoom.id)?.imageScale || 1.0) * 100).toFixed(0)}%)`
                        : ` (Scale: ${((polygons.find(p => p.id === selectedForZoom.id)?.imageScale || 1.0) * 100).toFixed(0)}%)`
                      }
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={zoomOut}
                        disabled={
                          selectedForZoom.kind === 'rect' 
                            ? (rectangles.find(r => r.id === selectedForZoom.id)?.imageScale || 1.0) <= 0.5
                            : (polygons.find(p => p.id === selectedForZoom.id)?.imageScale || 1.0) <= 0.5
                        }
                      >
                        Zoom Out
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={resetZoom}
                      >
                        Reset
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={zoomIn}
                        disabled={
                          selectedForZoom.kind === 'rect' 
                            ? (rectangles.find(r => r.id === selectedForZoom.id)?.imageScale || 1.0) >= 3.0
                            : (polygons.find(p => p.id === selectedForZoom.id)?.imageScale || 1.0) >= 3.0
                        }
                      >
                        Zoom In
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Click on an image to select it, then drag to reposition. Use zoom controls to resize while maintaining aspect ratio.
                    <br />
                    <strong>Keyboard shortcuts:</strong> + (zoom in), - (zoom out), 0 (reset zoom)
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3 justify-end mt-4">
                <Button variant="outline" onClick={() => renderPreviewCanvas()} disabled={isGeneratingFinal}>Re-generate Preview</Button>
                <Button onClick={() => { generateFinalImage(); setIsPreviewOpen(false); }} disabled={isGeneratingFinal}>
                  {isGeneratingFinal ? 'Generating HD Image...' : 'Export HD & Download'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Removal Modal */}
      {showBgRemovalModal && productData.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-lg">Remove Background from Images</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Select images that need background removal
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowBgRemovalModal(false);
                  setSelectedForBgRemoval(new Set());
                }}
                disabled={processingBgRemoval}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 overflow-auto flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {productData.map((product) => {
                  const imageUrl = optimizedImageCache.current.get(product.image) || product.image;
                  const isSelected = selectedForBgRemoval.has(product.id);
                  
                  return (
                    <div
                      key={product.id}
                      className={`relative border-2 rounded-lg p-2 cursor-pointer transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400'
                      }`}
                      onClick={() => {
                        if (!processingBgRemoval) {
                          const newSelected = new Set(selectedForBgRemoval);
                          if (isSelected) {
                            newSelected.delete(product.id);
                          } else {
                            newSelected.add(product.id);
                          }
                          setSelectedForBgRemoval(newSelected);
                        }
                      }}
                    >
                      <div className="absolute top-2 right-2 z-10">
                        {isSelected ? (
                          <CheckCircle2 className="h-6 w-6 text-blue-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="aspect-square relative overflow-hidden rounded bg-gray-100">
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      <p className="text-sm font-medium mt-2 text-center truncate">
                        {product.name}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              {processingBgRemoval && (
                <div className="mt-6 space-y-2">
                  <div className="text-sm font-medium">Processing Background Removal...</div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${bgRemovalProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This may take a moment depending on image sizes...
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between p-4 border-t">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedForBgRemoval(new Set(productData.map(p => p.id)))}
                  disabled={processingBgRemoval}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedForBgRemoval(new Set())}
                  disabled={processingBgRemoval}
                >
                  Clear Selection
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedForBgRemoval.size} of {productData.length} selected
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBgRemovalModal(false);
                    setSelectedForBgRemoval(new Set());
                  }}
                  disabled={processingBgRemoval}
                >
                  Skip
                </Button>
                <Button
                  onClick={processBackgroundRemoval}
                  disabled={processingBgRemoval || selectedForBgRemoval.size === 0}
                >
                  {processingBgRemoval ? 'Processing...' : 'Remove Background'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Font Customization Modal */}
      <FontCustomizationModal
        isOpen={showFontModal}
        onClose={() => {
          setShowFontModal(false);
          setEditingTextElement(null);
        }}
        onSave={handleFontSave}
        initialSettings={getCurrentFontSettings()}
        text={currentText}
        onTextChange={setCurrentText}
      />
    </div>
  );
} 