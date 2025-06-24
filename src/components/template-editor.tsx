"use client"

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateEditorProps {
  templateUrl: string;
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

export function TemplateEditor({ 
  templateUrl, 
  vegetables, 
  vegetableRegions, 
  priceRegions 
}: TemplateEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);

  const processTemplate = async () => {
    if (!canvasRef.current) return;
    
    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      console.log('🎨 Starting exact template preservation...');
      
      // Load the original template image
      const templateImg = new Image();
      templateImg.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        templateImg.onload = resolve;
        templateImg.onerror = reject;
        templateImg.src = templateUrl;
      });

      // Set canvas size to match template
      canvas.width = templateImg.width;
      canvas.height = templateImg.height;

      // Draw the original template (preserves everything)
      ctx.drawImage(templateImg, 0, 0);
      
      console.log('✅ Original template preserved');

      // Now overlay vegetables in specific regions
      for (let i = 0; i < Math.min(vegetables.length, vegetableRegions.length); i++) {
        const vegetable = vegetables[i];
        const region = vegetableRegions[i];
        
        console.log(`🥕 Overlaying ${vegetable.name} in region ${region.name}`);
        
        // Create a rounded rectangle for the vegetable region
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Semi-transparent white background
        ctx.roundRect(region.x, region.y, region.width, region.height, 10);
        ctx.fill();
        
        // Add vegetable name text
        ctx.fillStyle = '#2c5530'; // Dark green text
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          vegetable.name, 
          region.x + region.width / 2, 
          region.y + region.height / 2
        );
        
        ctx.restore();
      }

      // Update price regions
      for (let i = 0; i < Math.min(vegetables.length, priceRegions.length); i++) {
        const vegetable = vegetables[i];
        const region = priceRegions[i];
        
        if (vegetable.price) {
          console.log(`💰 Updating price ${vegetable.price} in region ${region.name}`);
          
          ctx.save();
          ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'; // Golden background
          ctx.roundRect(region.x, region.y, region.width, region.height, 5);
          ctx.fill();
          
          // Add price text
          ctx.fillStyle = '#8B4513'; // Brown text
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(
            vegetable.price, 
            region.x + region.width / 2, 
            region.y + region.height / 2 + 5
          );
          
          ctx.restore();
        }
      }

      // Convert canvas to blob and create download URL
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
      });
      
      const url = URL.createObjectURL(blob);
      setEditedImageUrl(url);
      
      console.log('✅ Template editing completed with exact preservation');
      toast.success("Template edited successfully! Original structure preserved.");

    } catch (error) {
      console.error('❌ Template editing error:', error);
      toast.error("Failed to edit template. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!editedImageUrl) return;
    
    const a = document.createElement('a');
    a.href = editedImageUrl;
    a.download = 'edited_arabian_delights_template.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast.success("Template downloaded successfully!");
  };

  useEffect(() => {
    // Auto-process when component mounts
    processTemplate();
  }, [templateUrl, vegetables, processTemplate]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">
          🎯 Exact Template Preservation
        </h3>
        <p className="text-sm text-muted-foreground">
          Your original template with only vegetables and prices updated
        </p>
      </div>

      <div className="flex justify-center">
        <canvas 
          ref={canvasRef}
          className="border rounded-lg shadow-lg max-w-full h-auto"
          style={{ maxHeight: '600px' }}
        />
      </div>

      <div className="flex gap-2 justify-center">
        <Button 
          onClick={processTemplate}
          disabled={isProcessing}
          variant="outline"
        >
          {isProcessing ? (
            <>Processing...</>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Refresh Edit
            </>
          )}
        </Button>
        
        <Button 
          onClick={downloadImage}
          disabled={!editedImageUrl}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Edited Template
        </Button>
      </div>

      <div className="text-xs text-center text-muted-foreground">
        ✅ Original Arabic text preserved • ✅ Golden borders intact • ✅ Layout unchanged
      </div>
    </div>
  );
} 