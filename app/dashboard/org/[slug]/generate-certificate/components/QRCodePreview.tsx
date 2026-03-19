'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, Palette, Square, Circle, Hexagon, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type QRStyle = 'square' | 'rounded' | 'dots' | 'classy';

interface QRCodePreviewProps {
  verificationUrl?: string;
  size?: number;
  style?: QRStyle;
  foregroundColor?: string;
  backgroundColor?: string;
  onChange?: (config: QRCodeConfig) => void;
  className?: string;
}

export interface QRCodeConfig {
  style: QRStyle;
  foregroundColor: string;
  backgroundColor: string;
  size: number;
}

const QR_STYLES: { value: QRStyle; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'square', label: 'Square', icon: <Square className="w-4 h-4" />, description: 'Classic square modules' },
  { value: 'rounded', label: 'Rounded', icon: <Circle className="w-4 h-4" />, description: 'Soft rounded corners' },
  { value: 'dots', label: 'Dots', icon: <Circle className="w-3 h-3" />, description: 'Circular dot pattern' },
  { value: 'classy', label: 'Classy', icon: <Hexagon className="w-4 h-4" />, description: 'Elegant rounded style' },
];

// Simple QR code matrix generator (for preview purposes)
// In production, you'd use a library like qrcode or qr.js
function generateQRMatrix(data: string, size: number = 21): boolean[][] {
  // This is a simplified version for preview
  // Real QR generation would use proper encoding
  const matrix: boolean[][] = [];

  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      // Position detection patterns (corners)
      const isTopLeftFinder = x < 7 && y < 7;
      const isTopRightFinder = x >= size - 7 && y < 7;
      const isBottomLeftFinder = x < 7 && y >= size - 7;

      if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
        // Finder pattern
        const localX = x < 7 ? x : (x >= size - 7 ? x - (size - 7) : x);
        const localY = y < 7 ? y : (y >= size - 7 ? y - (size - 7) : y);
        const isOuter = localX === 0 || localX === 6 || localY === 0 || localY === 6;
        const isInner = localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4;
        row.push(isOuter || isInner);
      } else {
        // Pseudo-random data based on position and input
        const hash = (data.charCodeAt(x % data.length) || 0) + x * 31 + y * 17;
        row.push(hash % 3 !== 0);
      }
    }
    matrix.push(row);
  }

  return matrix;
}

export function QRCodePreview({
  verificationUrl = 'https://verify.example.com/abc123',
  size = 120,
  style: initialStyle = 'square',
  foregroundColor: initialFg = '#000000',
  backgroundColor: initialBg = '#FFFFFF',
  onChange,
  className,
}: QRCodePreviewProps) {
  const [style, setStyle] = useState<QRStyle>(initialStyle);
  const [fgColor, setFgColor] = useState(initialFg);
  const [bgColor, setBgColor] = useState(initialBg);
  const [showSettings, setShowSettings] = useState(false);

  const matrix = generateQRMatrix(verificationUrl);
  const moduleSize = size / matrix.length;

  // Notify parent of changes
  useEffect(() => {
    onChange?.({
      style,
      foregroundColor: fgColor,
      backgroundColor: bgColor,
      size,
    });
  }, [style, fgColor, bgColor, size, onChange]);

  const renderModule = (x: number, y: number, filled: boolean) => {
    if (!filled) return null;

    const baseProps = {
      key: `${x}-${y}`,
      fill: fgColor,
    };

    const px = x * moduleSize;
    const py = y * moduleSize;
    const padding = moduleSize * 0.1;
    const actualSize = moduleSize - padding * 2;

    switch (style) {
      case 'dots':
        return (
          <circle
            {...baseProps}
            cx={px + moduleSize / 2}
            cy={py + moduleSize / 2}
            r={actualSize / 2}
          />
        );
      case 'rounded':
        return (
          <rect
            {...baseProps}
            x={px + padding}
            y={py + padding}
            width={actualSize}
            height={actualSize}
            rx={actualSize * 0.3}
          />
        );
      case 'classy':
        // Check neighbors for connected styling
        const hasRight = x < matrix.length - 1 && matrix[y]?.[x + 1];
        const hasBottom = y < matrix.length - 1 && matrix[y + 1]?.[x];

        return (
          <rect
            {...baseProps}
            x={px + padding}
            y={py + padding}
            width={actualSize + (hasRight ? padding * 2 : 0)}
            height={actualSize + (hasBottom ? padding * 2 : 0)}
            rx={actualSize * 0.2}
          />
        );
      case 'square':
      default:
        return (
          <rect
            {...baseProps}
            x={px + padding / 2}
            y={py + padding / 2}
            width={actualSize + padding}
            height={actualSize + padding}
          />
        );
    }
  };

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium">QR Code Preview</Label>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-1.5"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Customize
        </Button>
      </div>

      {/* QR Code Display */}
      <div className="flex justify-center mb-4">
        <div
          className="rounded-lg border shadow-sm overflow-hidden"
          style={{ backgroundColor: bgColor, padding: moduleSize * 2 }}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {matrix.map((row, y) =>
              row.map((filled, x) => renderModule(x, y, filled))
            )}
          </svg>
        </div>
      </div>

      {/* Sample URL */}
      <div className="text-center mb-4">
        <code className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded">
          {verificationUrl.length > 35 ? verificationUrl.slice(0, 35) + '...' : verificationUrl}
        </code>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="space-y-4 pt-4 border-t">
          {/* Style Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Style</Label>
            <div className="grid grid-cols-4 gap-2">
              {QR_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
                    style === s.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                  title={s.description}
                >
                  {s.icon}
                  <span className="text-[10px]">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Palette className="w-3 h-3" />
                Foreground
              </Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-10 h-8 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Palette className="w-3 h-3" />
                Background
              </Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-8 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { fg: '#000000', bg: '#FFFFFF', label: 'Classic' },
                { fg: '#1e40af', bg: '#dbeafe', label: 'Blue' },
                { fg: '#166534', bg: '#dcfce7', label: 'Green' },
                { fg: '#7c2d12', bg: '#fed7aa', label: 'Orange' },
                { fg: '#581c87', bg: '#f3e8ff', label: 'Purple' },
                { fg: '#FFFFFF', bg: '#000000', label: 'Inverted' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setFgColor(preset.fg);
                    setBgColor(preset.bg);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 border rounded-md text-xs hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-sm border"
                    style={{ backgroundColor: preset.bg }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-[1px] m-[3px]"
                      style={{ backgroundColor: preset.fg }}
                    />
                  </div>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-[10px]">Auto-generated</Badge>
          <span>QR code links to certificate verification page</span>
        </div>
      </div>
    </Card>
  );
}
