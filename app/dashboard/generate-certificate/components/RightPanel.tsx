'use client';

import { CertificateField, CERTIFICATE_FONTS, PRESET_COLORS, DATE_FORMATS } from '@/lib/types/certificate';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { useState } from 'react';

interface RightPanelProps {
  selectedField: CertificateField | undefined;
  onFieldUpdate: (updates: Partial<CertificateField>) => void;
}

export function RightPanel({ selectedField, onFieldUpdate }: RightPanelProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!selectedField) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </div>
            <p className="text-sm">No field selected</p>
            <p className="text-xs mt-1">Select a field to edit its properties</p>
          </div>
        </Card>
      </div>
    );
  }

  const isDateField = selectedField.type === 'start_date' || selectedField.type === 'end_date';
  const isQRCode = selectedField.type === 'qr_code';

  return (
    <div className="p-4 space-y-5 text-sm">
      {/* Field Info */}
      <div className="space-y-1 pb-3 border-b">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-xs uppercase text-muted-foreground tracking-wider">Selected Element</span>
          <Badge variant="secondary" className="text-[10px] h-5 font-mono px-1.5">{selectedField.type}</Badge>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Input 
            value={selectedField.label} 
            onChange={(e) => onFieldUpdate({ label: e.target.value })}
            className="h-7 text-xs font-medium"
            placeholder="Field Name"
          />
        </div>
      </div>

      {/* Geometry */}
      <div className="space-y-3 pb-3 border-b">
        <span className="font-semibold text-xs text-muted-foreground">Layout</span>
        <div className="grid grid-cols-2 gap-x-2 gap-y-2">
          <div className="flex items-center gap-2">
             <span className="text-[10px] w-3 text-muted-foreground">X</span>
             <Input
              type="number"
              value={Math.round(selectedField.x)}
              onChange={(e) => onFieldUpdate({ x: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs px-2"
            />
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] w-3 text-muted-foreground">Y</span>
             <Input
              type="number"
              value={Math.round(selectedField.y)}
              onChange={(e) => onFieldUpdate({ y: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs px-2"
            />
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] w-3 text-muted-foreground">W</span>
             <Input
              type="number"
              value={Math.round(selectedField.width)}
              onChange={(e) => onFieldUpdate({ width: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs px-2"
            />
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] w-3 text-muted-foreground">H</span>
             <Input
              type="number"
              value={Math.round(selectedField.height)}
              onChange={(e) => onFieldUpdate({ height: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs px-2"
            />
          </div>
        </div>
      </div>

      {/* Typography (not for QR) */}
      {!isQRCode && (
        <div className="space-y-3 pb-3 border-b">
          <span className="font-semibold text-xs text-muted-foreground">Typography</span>
          
          <div className="space-y-2">
            <Select value={selectedField.fontFamily} onValueChange={(value) => onFieldUpdate({ fontFamily: value })}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CERTIFICATE_FONTS.map((font) => (
                  <SelectItem key={font.value} value={font.value} className="text-xs">
                    <span style={{ fontFamily: font.value }}>{font.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                 <Input
                  type="number"
                  value={selectedField.fontSize}
                  onChange={(e) => onFieldUpdate({ fontSize: parseInt(e.target.value) })}
                  className="h-7 text-xs pr-8"
                />
                <span className="absolute right-2 top-1.5 text-[10px] text-muted-foreground pointer-events-none">px</span>
              </div>
              <div className="flex border rounded-md overflow-hidden h-7">
                 <button
                   className={`flex-1 flex items-center justify-center hover:bg-muted ${selectedField.fontWeight === 'bold' ? 'bg-muted text-primary' : ''}`}
                   onClick={() => onFieldUpdate({ fontWeight: selectedField.fontWeight === 'bold' ? 'normal' : 'bold' })}
                 >
                   <Bold className="w-3.5 h-3.5" />
                 </button>
                 <div className="w-px bg-border" />
                 <button
                   className={`flex-1 flex items-center justify-center hover:bg-muted ${selectedField.fontStyle === 'italic' ? 'bg-muted text-primary' : ''}`}
                   onClick={() => onFieldUpdate({ fontStyle: selectedField.fontStyle === 'italic' ? 'normal' : 'italic' })}
                 >
                   <Italic className="w-3.5 h-3.5" />
                 </button>
              </div>
            </div>

            <div className="flex border rounded-md overflow-hidden h-7 w-full">
               <button
                 className={`flex-1 flex items-center justify-center hover:bg-muted ${selectedField.textAlign === 'left' ? 'bg-muted text-primary' : ''}`}
                 onClick={() => onFieldUpdate({ textAlign: 'left' })}
               >
                 <AlignLeft className="w-3.5 h-3.5" />
               </button>
               <div className="w-px bg-border" />
               <button
                 className={`flex-1 flex items-center justify-center hover:bg-muted ${selectedField.textAlign === 'center' ? 'bg-muted text-primary' : ''}`}
                 onClick={() => onFieldUpdate({ textAlign: 'center' })}
               >
                 <AlignCenter className="w-3.5 h-3.5" />
               </button>
               <div className="w-px bg-border" />
               <button
                 className={`flex-1 flex items-center justify-center hover:bg-muted ${selectedField.textAlign === 'right' ? 'bg-muted text-primary' : ''}`}
                 onClick={() => onFieldUpdate({ textAlign: 'right' })}
               >
                 <AlignRight className="w-3.5 h-3.5" />
               </button>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Color</span>
            <div className="flex flex-wrap gap-2">
               {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.value}
                  className={`
                    w-6 h-6 rounded-full border border-border/50 transition-all hover:scale-110
                    ${selectedField.color === preset.value ? 'ring-2 ring-primary ring-offset-2' : ''}
                  `}
                  style={{ backgroundColor: preset.value }}
                  onClick={() => onFieldUpdate({ color: preset.value })}
                  title={preset.name}
                />
              ))}
              <div className="relative">
                <button
                  className={`
                    w-6 h-6 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 border border-border/50
                    ${showColorPicker ? 'ring-2 ring-primary ring-offset-2' : ''}
                  `}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  title="Custom Color"
                />
                {showColorPicker && (
                  <div className="absolute top-8 right-0 z-50 p-2 bg-popover rounded-lg border shadow-xl">
                    <HexColorPicker color={selectedField.color} onChange={(color) => onFieldUpdate({ color })} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Settings */}
      <div className="space-y-3 pb-3">
        <span className="font-semibold text-xs text-muted-foreground">Content</span>
        
        {isDateField && (
           <div className="space-y-1">
             <Label className="text-[10px] text-muted-foreground">Date Format</Label>
             <Select
                value={selectedField.dateFormat || 'MMMM dd, yyyy'}
                onValueChange={(value) => onFieldUpdate({ dateFormat: value })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value} className="text-xs">
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </div>
        )}

        {!isQRCode && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Prefix</Label>
              <Input
                value={selectedField.prefix || ''}
                onChange={(e) => onFieldUpdate({ prefix: e.target.value })}
                className="h-7 text-xs"
                placeholder="Prefix"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Suffix</Label>
              <Input
                value={selectedField.suffix || ''}
                onChange={(e) => onFieldUpdate({ suffix: e.target.value })}
                className="h-7 text-xs"
                placeholder="Suffix"
              />
            </div>
          </div>
        )}
        
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Sample Value</Label>
          <Input
            value={selectedField.sampleValue || ''}
            onChange={(e) => onFieldUpdate({ sampleValue: e.target.value })}
            className="h-7 text-xs font-mono bg-muted/50"
            placeholder={selectedField.label}
          />
        </div>
      </div>
    </div>
  );
}
