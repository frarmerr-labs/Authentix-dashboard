'use client';

import { useRef, useEffect, useState } from 'react';
import { CertificateField } from '@/lib/types/certificate';
import { DraggableField } from './DraggableField';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

interface CertificateCanvasProps {
  fileUrl: string;
  fileType: 'pdf' | 'image';
  pdfWidth: number;
  pdfHeight: number;
  fields: CertificateField[];
  selectedFieldId: string | null;
  hiddenFields: Set<string>;
  scale: number;
  onFieldUpdate: (fieldId: string, updates: Partial<CertificateField>) => void;
  onFieldSelect: (fieldId: string) => void;
  onScaleChange: (scale: number) => void;
  onFieldDelete: (fieldId: string) => void;
  onTemplateResize?: (width: number, height: number) => void;
}

export function CertificateCanvas({
  fileUrl,
  fileType,
  pdfWidth,
  pdfHeight,
  fields,
  selectedFieldId,
  hiddenFields,
  scale,
  onFieldUpdate,
  onFieldSelect,
  onScaleChange,
  onFieldDelete,
  onTemplateResize,
}: CertificateCanvasProps) {
  /* State for Infinite Canvas */
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false); 
  
  /* Draggable Toolbar State */
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const toolbarDragStart = useRef({ x: 0, y: 0 });

  /* Template Resize State */
  const [isResizingTemplate, setIsResizingTemplate] = useState(false);
  const templateResizeStart = useRef({ x: 0, y: 0 });
  const initialTemplateDims = useRef({ w: 0, h: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);

  // Global events for Toolbar Dragging & Template Resizing
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent) => {
      // Toolbar Drag
      if (isDraggingToolbar) {
        setToolbarPos({
          x: e.clientX - toolbarDragStart.current.x,
          y: e.clientY - toolbarDragStart.current.y
        });
      }
      
      // Template Resize
      if (isResizingTemplate && onTemplateResize) {
        const deltaX = (e.clientX - templateResizeStart.current.x) / scale; 
        const deltaY = (e.clientY - templateResizeStart.current.y) / scale;
        
        onTemplateResize(
            Math.max(100, initialTemplateDims.current.w + deltaX),
            Math.max(100, initialTemplateDims.current.h + deltaY)
        );
      }
    };
    
    const handleGlobalUp = () => {
        setIsDraggingToolbar(false);
        setIsResizingTemplate(false);
    };

    if (isDraggingToolbar || isResizingTemplate) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [isDraggingToolbar, isResizingTemplate, scale, onTemplateResize]);

  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    e.stopPropagation();
    setIsDraggingToolbar(true);
    toolbarDragStart.current = { 
        x: e.clientX - toolbarPos.x, 
        y: e.clientY - toolbarPos.y 
    };
  };

  const handleTemplateResizeStart = (e: React.MouseEvent) => {
     e.stopPropagation();
     e.preventDefault(); 
     setIsResizingTemplate(true);
     templateResizeStart.current = { x: e.clientX, y: e.clientY };
     initialTemplateDims.current = { w: pdfWidth, h: pdfHeight };
  };

  // Update canvas width based on scale (Legacy logic maintained for now as per plan)
  useEffect(() => {
    setCanvasWidth(pdfWidth * scale);
  }, [pdfWidth, scale]);
  
  const handleFieldDrag = (id: string, deltaX: number, deltaY: number) => {
    const field = fields.find(f => f.id === id);
    if (field) {
      onFieldUpdate(id, {
        x: field.x + deltaX / scale,
        y: field.y + deltaY / scale,
      });
    }
  };

  const handleFieldResize = (id: string, width: number, height: number) => {
    const field = fields.find(f => f.id === id);
    if (field) {
      onFieldUpdate(id, {
        width: width / scale,
        height: height / scale,
      });
    }
  };

  // Track Space key for panning mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
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
  }, []);

  // Wheel Handler: Pan coordinates or Zoom if Ctrl/Meta pressed
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      // Zoom
      const delta = -e.deltaY * 0.005; // smoother zoom
      const newScale = Math.min(5, Math.max(0.1, scale + delta));
      onScaleChange(newScale);
    } else {
      // Pan
      e.preventDefault(); // prevent browser back/forward gestures
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Mouse Drag Handlers for Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or Space+Left click starts panning
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setIsPanning(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Zoom Controls
  const handleZoomIn = () => onScaleChange(Math.min(5, scale + 0.1));
  const handleZoomOut = () => onScaleChange(Math.max(0.1, scale - 0.1));
  
  const handleFitToWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 96; // margin
      onScaleChange(containerWidth / pdfWidth);
      setPan({ x: 0, y: 0 }); // Reset pan on fit
    }
  };

  const handleReset = () => {
      onScaleChange(0.5);
      setPan({ x: 0, y: 0 });
  }

  // Calculate cursor style
  const cursorStyle = isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default';

  const visibleFields = fields.filter(f => !hiddenFields.has(f.id));

  return (
    <div 
        className="relative w-full h-full bg-muted/20 overflow-hidden flex items-center justify-center select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={containerRef}
        style={{ cursor: cursorStyle }}
    >
      {/* Zoom Controls - Draggable */}
      <div 
        className="absolute top-4 right-4 z-50 flex gap-2 bg-background/90 backdrop-blur shadow-sm p-1.5 rounded-lg border cursor-move"
        style={{ transform: `translate(${toolbarPos.x}px, ${toolbarPos.y}px)` }}
        onMouseDown={handleToolbarMouseDown}
      >
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs font-medium w-12 flex items-center justify-center select-none">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-4 bg-border my-auto mx-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFitToWidth} title="Fit to width">
          <Maximize className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="Reset to 50%">
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Infinite Canvas Content Wrapper */}
      <div 
        className="relative shadow-xl transition-transform duration-75 ease-out bg-white origin-center will-change-transform"
        style={{ 
          width: canvasWidth, 
          height: canvasWidth * (pdfHeight / pdfWidth),
          transform: `translate(${pan.x}px, ${pan.y}px)`, // Scale is handled by width/height in this legacy logic, let's switch to transform scale?
          // User asked for resize corners. Using width/height logic is easier for that.
          // BUT for 'infinite canvas' usually scale transform is better for performance.
          // However, DraggableField uses `scale` prop to adjust its own math.
          // If I change the container width/height vs Transform Scale, I must align DraggableField.
          // Current Logic: setCanvasWidth(pdfWidth * scale) -> Actual pixel size changes.
          // This is NOT transform:scale().
          // Refactoring to transform:scale() is cleaner for infinite canvas but requires updating DraggableField logic significantly (to not double apply scale).
          // Given the prompt "refactor interactions" not "rewrite math", I will stick to the current "Pixel Size" scaling 
          // but apply PAN via transform.
        }}
      >
          {fileType === 'pdf' ? (
            <iframe 
              src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
              className="w-full h-full pointer-events-none select-none" 
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <img 
              src={fileUrl} 
              alt="Certificate template" 
              style={{ width: '100%', height: '100%' }} 
              className="block select-none" 
            />
          )}

          {/* Fields Overlay */}
          <div className="absolute inset-0 overflow-hidden">
            {visibleFields.map((field) => (
              <DraggableField
                key={field.id}
                field={field}
                scale={scale} // Scale passed down for drag math
                isSelected={selectedFieldId === field.id}
                onDrag={(deltaX, deltaY) => handleFieldDrag(field.id, deltaX, deltaY)}
                onResize={(width, height) => handleFieldResize(field.id, width, height)}
                onSelect={(e) => {
                    e.stopPropagation(); // Prevent canvas pan start
                    onFieldSelect(field.id);
                }}
                onDelete={() => onFieldDelete(field.id)}
              />
            ))}
          </div>

          {/* Resize Handles (Visual Only for now) */}
          <div 
            className="absolute -right-1 -bottom-1 w-4 h-4 bg-primary border-2 border-white rounded-full cursor-se-resize shadow-md hover:scale-125 transition-transform z-50"
            onMouseDown={handleTemplateResizeStart}
          ></div>
          
      </div>

      {/* Info Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-[10px] text-muted-foreground bg-background/90 backdrop-blur border px-3 py-1 rounded-full shadow-sm select-none pointer-events-none">
        {Math.round(pdfWidth)} × {Math.round(pdfHeight)}px • {fields.length} field{fields.length !== 1 ? 's' : ''} ({hiddenFields.size} hidden)
      </div>
    </div>
  );

}
