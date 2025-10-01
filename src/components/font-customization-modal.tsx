"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Type, Palette, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface FontCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fontSettings: FontSettings) => void;
  initialSettings?: FontSettings;
  text: string;
  onTextChange: (text: string) => void;
}

export interface FontSettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontColor: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
}

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'Courier New'
];

const FONT_WEIGHTS = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
  { value: '100', label: 'Thin' },
  { value: '300', label: 'Light' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
  { value: '900', label: 'Black' }
];

export function FontCustomizationModal({
  isOpen,
  onClose,
  onSave,
  initialSettings,
  text,
  onTextChange
}: FontCustomizationModalProps) {
  const [fontSettings, setFontSettings] = useState<FontSettings>({
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 'normal',
    fontColor: '#000000',
    backgroundColor: 'transparent',
    textAlign: 'center'
  });

  useEffect(() => {
    if (initialSettings) {
      setFontSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleSave = () => {
    onSave(fontSettings);
    onClose();
  };

  const handleSettingChange = (key: keyof FontSettings, value: any) => {
    setFontSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Font Customization
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="text-input">Text Content</Label>
            <Input
              id="text-input"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Enter your text here..."
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div 
              className="border rounded-lg p-4 min-h-[80px] flex items-center justify-center"
              style={{ backgroundColor: fontSettings.backgroundColor === 'transparent' ? '#f8f9fa' : fontSettings.backgroundColor }}
            >
              <span
                style={{
                  fontFamily: fontSettings.fontFamily,
                  fontSize: `${fontSettings.fontSize}px`,
                  fontWeight: fontSettings.fontWeight,
                  color: fontSettings.fontColor,
                  textAlign: fontSettings.textAlign,
                  width: '100%'
                }}
              >
                {text || 'Sample Text'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Font Family */}
            <div className="space-y-2">
              <Label htmlFor="font-family">Font Family</Label>
              <select
                id="font-family"
                className="w-full p-2 border rounded-md"
                value={fontSettings.fontFamily}
                onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label htmlFor="font-size">Font Size</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="font-size"
                  type="number"
                  min="8"
                  max="72"
                  value={fontSettings.fontSize}
                  onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">px</span>
                <input
                  type="range"
                  min="8"
                  max="72"
                  value={fontSettings.fontSize}
                  onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Font Weight */}
            <div className="space-y-2">
              <Label htmlFor="font-weight">Font Weight</Label>
              <select
                id="font-weight"
                className="w-full p-2 border rounded-md"
                value={fontSettings.fontWeight}
                onChange={(e) => handleSettingChange('fontWeight', e.target.value)}
              >
                {FONT_WEIGHTS.map(weight => (
                  <option key={weight.value} value={weight.value}>
                    {weight.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Text Color */}
            <div className="space-y-2">
              <Label htmlFor="font-color">Text Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="font-color"
                  type="color"
                  value={fontSettings.fontColor}
                  onChange={(e) => handleSettingChange('fontColor', e.target.value)}
                  className="w-12 h-10 border rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={fontSettings.fontColor}
                  onChange={(e) => handleSettingChange('fontColor', e.target.value)}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <Label htmlFor="bg-color">Background Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="bg-color"
                  type="color"
                  value={fontSettings.backgroundColor === 'transparent' ? '#ffffff' : fontSettings.backgroundColor}
                  onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                  className="w-12 h-10 border rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={fontSettings.backgroundColor}
                  onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                  className="flex-1"
                  placeholder="transparent or #ffffff"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSettingChange('backgroundColor', 'transparent')}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Text Alignment */}
            <div className="space-y-2">
              <Label>Text Alignment</Label>
              <div className="flex gap-2">
                <Button
                  variant={fontSettings.textAlign === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSettingChange('textAlign', 'left')}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant={fontSettings.textAlign === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSettingChange('textAlign', 'center')}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant={fontSettings.textAlign === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSettingChange('textAlign', 'right')}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Apply Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
