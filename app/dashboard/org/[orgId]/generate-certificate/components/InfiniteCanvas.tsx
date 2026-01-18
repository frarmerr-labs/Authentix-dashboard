'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { CertificateField } from '@/lib/types/certificate';
import { DraggableField } from './DraggableField';
import { CanvasMinimap } from './CanvasMinimap';
import { Button } from '@/components/ui/button';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Grid3X3,
  Move,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfiniteCanvasProps {
  fileUrl: string;
  fileType: 'pdf' | 'image';
  pdfWidth: number;
  pdfHeight: number;
  fields: CertificateField[];
  selectedFieldId: string | null;
  hiddenFields: Set<string>;
  scale: number;
  currentPage?: number;
  totalPages?: number;
  onFieldUpdate: (fieldId: string, updates: Partial<CertificateField>) => void;
  onFieldSelect: (fieldId: string) => void;
  onScaleChange: (scale: number) => void;
  onFieldDelete: (fieldId: string) => void;
  onTemplateResize?: (width: number, height: number) => void;
  onPageChange?: (page: number) => void;
}

const GRID_SIZE = 10; // Grid snap size in pixels
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

export function InfiniteCanvas({
  fileUrl,
  fileType,
  pdfWidth,
  pdfHeight,
  fields,
  selectedFieldId,
  hiddenFields,
  scale,
  currentPage = 1,
  totalPages = 1,
  onFieldUpdate,
  onFieldSelect,
  onScaleChange,
  onFieldDelete,
  onTemplateResize,
  onPageChange,
}: InfiniteCanvasProps) {
  // Canvas state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Calculate canvas dimensions
  const canvasWidth = pdfWidth * scale;
  const canvasHeight = pdfHeight * scale;

  // Zoom centered on a point
  const zoomAtPoint = useCallback((newScale: number, centerX: number, centerY: number) => {
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    const scaleRatio = clampedScale / scale;

    // Adjust pan to keep the point under cursor stationary
    setPan(prev => ({
      x: centerX - (centerX - prev.x) * scaleRatio,
      y: centerY - (centerY - prev.y) * scaleRatio,
    }));

    onScaleChange(clampedScale);
  }, [scale, onScaleChange]);

  // Wheel handler with zoom centered on cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom centered on cursor
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      const newScale = scale * (1 + delta);

      zoomAtPoint(newScale, centerX, centerY);
    } else {
      // Pan
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [scale, zoomAtPoint]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Space for pan mode
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        onScaleChange(Math.min(MAX_SCALE, scale + 0.1));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        onScaleChange(Math.max(MIN_SCALE, scale - 0.1));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        onScaleChange(1);
        setPan({ x: 0, y: 0 });
      }

      // Grid toggle
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setShowGrid(prev => !prev);
      }

      // Snap toggle
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        setSnapToGrid(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [scale, onScaleChange]);

  // Mouse handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - panStartRef.current.x;
      const deltaY = e.clientY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.panX + deltaX,
        y: panStartRef.current.panY + deltaY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Snap position to grid
  const snapPosition = useCallback((x: number, y: number) => {
    if (!snapToGrid) return { x, y };
    return {
      x: Math.round(x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(y / GRID_SIZE) * GRID_SIZE,
    };
  }, [snapToGrid]);

  // Field drag handler with optional grid snapping
  const handleFieldDrag = useCallback((id: string, deltaX: number, deltaY: number) => {
    const field = fields.find(f => f.id === id);
    if (!field) return;

    let newX = field.x + deltaX / scale;
    let newY = field.y + deltaY / scale;

    if (snapToGrid) {
      const snapped = snapPosition(newX, newY);
      newX = snapped.x;
      newY = snapped.y;
    }

    onFieldUpdate(id, { x: newX, y: newY });
  }, [fields, scale, snapToGrid, snapPosition, onFieldUpdate]);

  const handleFieldResize = useCallback((id: string, width: number, height: number) => {
    let w = width / scale;
    let h = height / scale;

    if (snapToGrid) {
      w = Math.round(w / GRID_SIZE) * GRID_SIZE;
      h = Math.round(h / GRID_SIZE) * GRID_SIZE;
    }

    onFieldUpdate(id, { width: Math.max(GRID_SIZE, w), height: Math.max(GRID_SIZE, h) });
  }, [scale, snapToGrid, onFieldUpdate]);

  // Zoom controls
  const handleZoomIn = () => onScaleChange(Math.min(MAX_SCALE, scale + 0.1));
  const handleZoomOut = () => onScaleChange(Math.max(MIN_SCALE, scale - 0.1));

  const handleFitToWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 100;
      const newScale = containerWidth / pdfWidth;
      onScaleChange(Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale)));
      setPan({ x: 0, y: 0 });
    }
  };

  const handleReset = () => {
    onScaleChange(1);
    setPan({ x: 0, y: 0 });
  };

  // Center canvas on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: (rect.width - canvasWidth) / 2,
        y: (rect.height - canvasHeight) / 2,
      });
    }
  }, []);

  const cursorStyle = isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default';
  const visibleFields = fields.filter(f => !hiddenFields.has(f.id));

  // Generate grid pattern
  const gridPattern = showGrid ? (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.3 }}>
      <defs>
        <pattern id="grid" width={GRID_SIZE * scale} height={GRID_SIZE * scale} patternUnits="userSpaceOnUse">
          <path
            d={`M ${GRID_SIZE * scale} 0 L 0 0 0 ${GRID_SIZE * scale}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-primary/30"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  ) : null;

  return (
    <div
      className="relative w-full h-full bg-muted/30 overflow-hidden select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      ref={containerRef}
      style={{ cursor: cursorStyle }}
    >
      {/* Checkerboard background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #808080 25%, transparent 25%),
            linear-gradient(-45deg, #808080 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #808080 75%),
            linear-gradient(-45deg, transparent 75%, #808080 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      />

      {/* Zoom & Control Toolbar */}
      <div className="absolute top-4 right-4 z-50 flex gap-2 bg-background/95 backdrop-blur-sm shadow-lg p-1.5 rounded-lg border">
        <Button
          variant={showGrid ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid (G)"
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant={snapToGrid ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => setSnapToGrid(!snapToGrid)}
          title="Snap to Grid (S)"
        >
          <Move className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-4 bg-border my-auto" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="Zoom Out (Ctrl+-)">
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs font-medium w-12 flex items-center justify-center select-none">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} title="Zoom In (Ctrl++)">
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-4 bg-border my-auto" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFitToWidth} title="Fit to Width">
          <Maximize className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="Reset (Ctrl+0)">
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Page Navigation (for multi-page PDFs) */}
      {totalPages > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background/95 backdrop-blur-sm shadow-lg px-3 py-1.5 rounded-lg border">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Canvas Content */}
      <div
        className="absolute shadow-2xl bg-white origin-top-left transition-none"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          left: pan.x,
          top: pan.y,
        }}
      >
        {/* Template Background */}
        {fileType === 'pdf' ? (
          <iframe
            src={`${fileUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full h-full pointer-events-none"
            style={{ border: 'none' }}
          />
        ) : (
          <img
            src={fileUrl}
            alt="Certificate template"
            className="w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
        )}

        {/* Grid Overlay */}
        {gridPattern}

        {/* Fields Overlay */}
        <div className="absolute inset-0">
          {visibleFields.map((field) => (
            <DraggableField
              key={field.id}
              field={field}
              scale={scale}
              isSelected={selectedFieldId === field.id}
              onDrag={(deltaX, deltaY) => handleFieldDrag(field.id, deltaX, deltaY)}
              onResize={(width, height) => handleFieldResize(field.id, width, height)}
              onSelect={(e) => {
                e.stopPropagation();
                onFieldSelect(field.id);
              }}
              onDelete={() => onFieldDelete(field.id)}
            />
          ))}
        </div>

        {/* Template Resize Handle */}
        {onTemplateResize && (
          <div
            className="absolute -right-1.5 -bottom-1.5 w-4 h-4 bg-primary border-2 border-white rounded-full cursor-se-resize shadow-md hover:scale-125 transition-transform z-50"
            onMouseDown={(e) => {
              e.stopPropagation();
              // Template resize logic would go here
            }}
          />
        )}
      </div>

      {/* Minimap */}
      {showMinimap && (
        <CanvasMinimap
          canvasWidth={pdfWidth}
          canvasHeight={pdfHeight}
          viewportX={-pan.x / scale}
          viewportY={-pan.y / scale}
          viewportWidth={(containerRef.current?.clientWidth || 800) / scale}
          viewportHeight={(containerRef.current?.clientHeight || 600) / scale}
          fields={visibleFields}
          onViewportChange={(x, y) => {
            setPan({ x: -x * scale, y: -y * scale });
          }}
        />
      )}

      {/* Info Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 text-[10px] text-muted-foreground bg-background/95 backdrop-blur-sm border px-3 py-1.5 rounded-full shadow-sm select-none pointer-events-none">
        <span>{Math.round(pdfWidth)} × {Math.round(pdfHeight)}px</span>
        <span className="w-px h-3 bg-border" />
        <span>{fields.length} field{fields.length !== 1 ? 's'  : ''}</span>
        {hiddenFields.size > 0 && (
          <>
            <span className="w-px h-3 bg-border" />
            <span>{hiddenFields.size} hidden</span>
          </>
        )}
        {snapToGrid && (
          <>
            <span className="w-px h-3 bg-border" />
            <span className="text-primary">Snap: {GRID_SIZE}px</span>
          </>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 right-4 z-40 text-[9px] text-muted-foreground/50 select-none pointer-events-none">
        Space: Pan • Scroll: Pan • Ctrl+Scroll: Zoom • G: Grid • S: Snap
      </div>
    </div>
  );
}
