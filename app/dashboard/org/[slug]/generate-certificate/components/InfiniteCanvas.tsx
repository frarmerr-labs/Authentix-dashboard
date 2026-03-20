'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { CertificateField } from '@/lib/types/certificate';
import { DraggableField } from './DraggableField';
import { Button } from '@/components/ui/button';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  RotateCw,
  Magnet,
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PDFViewer } from './PDFViewer';

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
  onTemplateResizeStart?: (width: number, height: number) => void;
  onPageChange?: (page: number) => void;
  onAssetDrop?: (url: string, name: string, x: number, y: number) => void;
  onPreviewToggle?: () => void;
  previewOpen?: boolean;
}

const SNAP_SIZE = 8;
const MIN_SCALE = 0.05;
const MAX_SCALE = 8;
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

// Clamp scale
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

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
  onTemplateResizeStart,
  onPageChange,
  onAssetDrop,
  onPreviewToggle,
  previewOpen,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });

  // Interaction state
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  // Template resize state
  const [isResizingTemplate, setIsResizingTemplate] = useState(false);
  const resizeCorner = useRef<ResizeHandle | null>(null);
  const templateResizeStart = useRef({ x: 0, y: 0 });
  const initialTemplateDims = useRef({ w: 0, h: 0 });

  // Template rotation state
  const [rotation, setRotation] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const rotateStartRef = useRef({ angle: 0, startRotation: 0, cx: 0, cy: 0 });

  // Visual dims during template resize — keeps PDF stable while dragging
  const [visualDims, setVisualDims] = useState<{ w: number; h: number } | null>(null);
  const latestResizeDims = useRef<{ w: number; h: number } | null>(null);

  // Panning refs
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const scaleRef = useRef(scale);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // Floating toolbar drag state
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const toolbarDragRef = useRef<{ dragging: boolean; startX: number; startY: number; origX: number; origY: number }>({
    dragging: false, startX: 0, startY: 0, origX: 0, origY: 0,
  });

  // Sync panRef so wheel handler (non-React closure) can read latest pan
  useEffect(() => { panRef.current = pan; }, [pan]);

  // Reset rotation when a new template is loaded
  useEffect(() => { setRotation(0); }, [fileUrl]);

  // ── Auto-fit on mount and when template changes ──────────────────────────
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    const padding = 80;
    const fitScale = clamp(
      Math.min((cw - padding * 2) / pdfWidth, (ch - padding * 2) / pdfHeight),
      MIN_SCALE,
      MAX_SCALE,
    );
    const centeredX = (cw - pdfWidth * fitScale) / 2;
    const centeredY = (ch - pdfHeight * fitScale) / 2;
    onScaleChange(fitScale);
    setPan({ x: centeredX, y: centeredY });
    panRef.current = { x: centeredX, y: centeredY };
  }, [pdfWidth, pdfHeight, onScaleChange]);

  // Run auto-fit whenever the template dimensions change
  const prevDimsRef = useRef({ w: 0, h: 0 });
  useEffect(() => {
    if (pdfWidth > 0 && pdfHeight > 0) {
      const prev = prevDimsRef.current;
      if (prev.w !== pdfWidth || prev.h !== pdfHeight) {
        prevDimsRef.current = { w: pdfWidth, h: pdfHeight };
        // Delay slightly so container has rendered
        setTimeout(fitToScreen, 50);
      }
    }
  }, [pdfWidth, pdfHeight, fitToScreen]);

  // Initialize toolbar position after mount
  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    setToolbarPos({ x: cw / 2 - 130, y: ch - 64 });
  }, []);

  // ── Non-passive wheel for trackpad / mouse wheel ─────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom (Mac trackpad pinch sends ctrlKey=true)
        // Use multiplicative delta so pinch feels natural
        const zoomFactor = e.deltaMode === 0
          ? 1 - e.deltaY * 0.004        // pixel mode (trackpad)
          : 1 - e.deltaY * 0.05;         // line mode (mouse wheel)

        const newScale = clamp(scaleRef.current * zoomFactor, MIN_SCALE, MAX_SCALE);
        const ratio = newScale / scaleRef.current;

        setPan(prev => ({
          x: cx - (cx - prev.x) * ratio,
          y: cy - (cy - prev.y) * ratio,
        }));
        onScaleChange(newScale);
      } else {
        // Two-finger scroll / mouse pan
        setPan(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onScaleChange]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        onScaleChange(clamp(scale + 0.1, MIN_SCALE, MAX_SCALE));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        onScaleChange(clamp(scale - 0.1, MIN_SCALE, MAX_SCALE));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        fitToScreen();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [scale, onScaleChange, fitToScreen]);

  // ── Mouse panning ─────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('[data-field]') ||
      target.closest('button') ||
      target.closest('[data-resize-handle]') ||
      target.closest('[data-toolbar]')
    ) return;

    if (e.button === 1 || e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  };

  useEffect(() => {
    if (!isPanning) return;

    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      const newPan = { x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy };
      setPan(newPan);
      panRef.current = newPan;
    };
    const onUp = () => setIsPanning(false);

    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isPanning]);

  // ── Template resize ───────────────────────────────────────────────────────
  const handleTemplateResizeStart = (e: React.MouseEvent, corner: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizingTemplate(true);
    resizeCorner.current = corner;
    templateResizeStart.current = { x: e.clientX, y: e.clientY };
    initialTemplateDims.current = { w: pdfWidth, h: pdfHeight };
    onTemplateResizeStart?.(pdfWidth, pdfHeight);
  };

  useEffect(() => {
    if (!isResizingTemplate) return;
    const onMove = (e: MouseEvent) => {
      if (!resizeCorner.current) return;
      const dx = (e.clientX - templateResizeStart.current.x) / scale;
      const dy = (e.clientY - templateResizeStart.current.y) / scale;
      let nw = initialTemplateDims.current.w;
      let nh = initialTemplateDims.current.h;
      switch (resizeCorner.current) {
        case 'se': nw += dx; nh += dy; break;
        case 'sw': nw -= dx; nh += dy; break;
        case 'ne': nw += dx; nh -= dy; break;
        case 'nw': nw -= dx; nh -= dy; break;
        case 'e':  nw += dx; break;
        case 'w':  nw -= dx; break;
        case 's':  nh += dy; break;
        case 'n':  nh -= dy; break;
      }
      // Update visual dims every frame for smooth visual feedback — no prop changes = no PDF re-render
      const dims = { w: Math.max(100, nw), h: Math.max(100, nh) };
      latestResizeDims.current = dims;
      setVisualDims(dims);
    };
    const onUp = () => {
      // Commit final size to parent only once on mouseUp (prevents PDF flicker)
      if (latestResizeDims.current) {
        onTemplateResize?.(latestResizeDims.current.w, latestResizeDims.current.h);
      }
      setIsResizingTemplate(false);
      resizeCorner.current = null;
      setVisualDims(null);
      latestResizeDims.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizingTemplate, scale, onTemplateResize]);

  // ── Template rotation ─────────────────────────────────────────────────────
  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + pan.x + canvasW / 2;
    const cy = rect.top + pan.y + canvasH / 2;
    const initialAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    rotateStartRef.current = { angle: initialAngle, startRotation: rotation, cx, cy };
    setIsRotating(true);
  };

  useEffect(() => {
    if (!isRotating) return;
    const onMove = (e: MouseEvent) => {
      const { cx, cy, angle: startAngle, startRotation } = rotateStartRef.current;
      const newAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
      setRotation(startRotation + newAngle - startAngle);
    };
    const onUp = () => setIsRotating(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isRotating]);

  // ── Toolbar dragging ──────────────────────────────────────────────────────
  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    // only drag from the grip icon
    if (!(e.target as HTMLElement).closest('[data-grip]')) return;
    e.preventDefault();
    toolbarDragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: toolbarPos?.x ?? 0,
      origY: toolbarPos?.y ?? 0,
    };

    const onMove = (ev: MouseEvent) => {
      if (!toolbarDragRef.current.dragging) return;
      setToolbarPos({
        x: toolbarDragRef.current.origX + ev.clientX - toolbarDragRef.current.startX,
        y: toolbarDragRef.current.origY + ev.clientY - toolbarDragRef.current.startY,
      });
    };
    const onUp = () => { toolbarDragRef.current.dragging = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Field interactions ────────────────────────────────────────────────────
  const handleFieldDrag = useCallback((id: string, deltaX: number, deltaY: number) => {
    const field = fields.find(f => f.id === id);
    if (!field) return;
    let nx = field.x + deltaX / scale;
    let ny = field.y + deltaY / scale;
    if (snapToGrid) {
      nx = Math.round(nx / SNAP_SIZE) * SNAP_SIZE;
      ny = Math.round(ny / SNAP_SIZE) * SNAP_SIZE;
    }
    onFieldUpdate(id, { x: nx, y: ny });
  }, [fields, scale, snapToGrid, onFieldUpdate]);

  const handleFieldResize = useCallback((id: string, width: number, height: number) => {
    let w = width / scale;
    let h = height / scale;
    if (snapToGrid) {
      w = Math.round(w / SNAP_SIZE) * SNAP_SIZE;
      h = Math.round(h / SNAP_SIZE) * SNAP_SIZE;
    }
    onFieldUpdate(id, { width: Math.max(SNAP_SIZE, w), height: Math.max(SNAP_SIZE, h) });
  }, [scale, snapToGrid, onFieldUpdate]);

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  const zoomTo = (newScale: number) => {
    if (!containerRef.current) { onScaleChange(clamp(newScale, MIN_SCALE, MAX_SCALE)); return; }
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    const cx = cw / 2; const cy = ch / 2;
    const ratio = clamp(newScale, MIN_SCALE, MAX_SCALE) / scale;
    setPan(prev => ({ x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio }));
    onScaleChange(clamp(newScale, MIN_SCALE, MAX_SCALE));
    setShowZoomMenu(false);
  };

  const cursor = isPanning ? 'grabbing' : (isSpacePressed ? 'grab' : 'default');
  const canvasW = pdfWidth * scale;
  const canvasH = pdfHeight * scale;
  // During resize: use visualDims for smooth visual feedback without re-rendering PDF
  const displayW = (visualDims?.w ?? pdfWidth) * scale;
  const displayH = (visualDims?.h ?? pdfHeight) * scale;
  const visibleFields = fields.filter(f => !hiddenFields.has(f.id));

  // ── Dot grid background ───────────────────────────────────────────────────
  // We use a CSS radial-gradient trick for dots — infinitely tiling, no SVG overhead
  const DOT_SPACING = 24;
  const DOT_SIZE = 1.5;
  const dotBg = {
    backgroundImage: `radial-gradient(circle, var(--canvas-dot) ${DOT_SIZE}px, transparent ${DOT_SIZE}px)`,
    backgroundSize: `${DOT_SPACING}px ${DOT_SPACING}px`,
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ ...dotBg, backgroundColor: 'var(--canvas-bg)', cursor }}
      onMouseDown={handleMouseDown}
      onMouseUp={() => { setIsPanning(false); }}
      onMouseLeave={() => { setIsPanning(false); }}
      onDragOver={(e) => {
        // Accept any drag — type check happens in onDrop; we must always
        // call preventDefault here to register as a valid drop target.
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (!onAssetDrop) return;
        const rect = containerRef.current!.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - pan.x) / scale;
        const canvasY = (e.clientY - rect.top - pan.y) / scale;
        // Internal asset drag
        const url = e.dataTransfer.getData('asset-url');
        if (url) {
          const name = e.dataTransfer.getData('asset-name');
          onAssetDrop(url, name, canvasX, canvasY);
          return;
        }
        // OS file drag
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
          const blobUrl = URL.createObjectURL(file);
          onAssetDrop(blobUrl, file.name, canvasX, canvasY);
        }
      }}
    >

      {/* ── Page Navigation (multi-page PDF) ── */}
      {totalPages > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border/50 px-2 py-1 rounded-lg shadow-lg">
          <Button
            variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs font-medium text-foreground/80 px-1 min-w-[72px] text-center">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* ── Certificate Canvas ── */}
      <div
        className="absolute"
        style={{
          width: displayW,
          height: displayH,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          willChange: isPanning ? 'transform' : 'auto',
        }}
        data-field="canvas"
      >
        {/* Rotation wrapper — rotates everything (template + handles) around its center */}
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center',
            position: 'relative',
            outline: '2px solid rgba(62, 207, 142, 0.85)',
            outlineOffset: '8px',
          }}
        >
          {/* Drop shadow behind template */}
          <div
            className="absolute inset-0 rounded-sm"
            style={{ boxShadow: '0 8px 40px 0 rgba(0,0,0,0.55)' }}
            aria-hidden
          />

          {/* Template image / PDF */}
          {fileType === 'pdf' ? (
            <div className="absolute inset-0 pointer-events-none select-none rounded-sm overflow-hidden">
              {isResizingTemplate ? (
                // CSS-scale the stable PDF render — no prop changes = no re-render = no flicker
                <div style={{
                  width: canvasW,
                  height: canvasH,
                  transform: `scale(${displayW / canvasW}, ${displayH / canvasH})`,
                  transformOrigin: 'top left',
                  willChange: 'transform',
                }}>
                  <PDFViewer fileUrl={fileUrl} pageNumber={currentPage} width={canvasW} />
                </div>
              ) : (
                <PDFViewer fileUrl={fileUrl} pageNumber={currentPage} width={displayW} />
              )}
            </div>
          ) : (
            <img
              src={fileUrl}
              alt="Certificate template"
              className="absolute inset-0 select-none pointer-events-none rounded-sm"
              style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
              draggable={false}
            />
          )}

          {/* Fields */}
          <div className="absolute inset-0 z-20">
            {visibleFields.map(field => (
              <div key={field.id} data-field="true">
                <DraggableField
                  field={field}
                  scale={scale}
                  isSelected={selectedFieldId === field.id}
                  onDrag={(dx, dy) => handleFieldDrag(field.id, dx, dy)}
                  onResize={(w, h) => handleFieldResize(field.id, w, h)}
                  onSelect={e => { e.stopPropagation(); onFieldSelect(field.id); }}
                  onDelete={() => onFieldDelete(field.id)}
                />
              </div>
            ))}
          </div>

          {/* Template resize handles (8 handles) + rotation handle */}
          {onTemplateResize && (
            <div className="absolute inset-0 pointer-events-none z-30">
              {/* ── Corners (resize square + outer rotation zone) ── */}
              {([
                { id: 'nw', cursor: 'nwse-resize', style: { top: -14, left: -14 }, rotStyle: { top: -30, left: -30 } },
                { id: 'ne', cursor: 'nesw-resize', style: { top: -14, right: -14 }, rotStyle: { top: -30, right: -30 } },
                { id: 'sw', cursor: 'nesw-resize', style: { bottom: -14, left: -14 }, rotStyle: { bottom: -30, left: -30 } },
                { id: 'se', cursor: 'nwse-resize', style: { bottom: -14, right: -14 }, rotStyle: { bottom: -30, right: -30 } },
              ] as const).map(({ id, cursor, style, rotStyle }) => (
                <div key={id}>
                  {/* Outer rotation zone — invisible, shows rotate icon on hover */}
                  <div
                    className="absolute w-5 h-5 pointer-events-auto flex items-center justify-center group/rot"
                    style={{ cursor: isRotating ? 'grabbing' : 'crosshair', ...rotStyle }}
                    data-resize-handle
                    onMouseDown={handleRotateStart}
                    title="Drag to rotate"
                  >
                    <RotateCw className="w-3 h-3 text-[#3ecf8e] opacity-0 group-hover/rot:opacity-100 transition-opacity" />
                  </div>
                  {/* Inner resize square */}
                  <div
                    className="absolute w-3 h-3 rounded-[2px] pointer-events-auto hover:scale-125 transition-transform"
                    style={{ backgroundColor: '#ffffff', border: '2px solid #3ecf8e', cursor, ...style }}
                    data-resize-handle
                    onMouseDown={e => handleTemplateResizeStart(e, id as ResizeHandle)}
                  />
                </div>
              ))}

              {/* ── Edge midpoints ── */}
              <div
                className="absolute w-3 h-3 rounded-[2px] pointer-events-auto cursor-ns-resize hover:scale-125 transition-transform"
                style={{ backgroundColor: '#ffffff', border: '2px solid #3ecf8e', top: -14, left: '50%', transform: 'translateX(-50%)' }}
                data-resize-handle
                onMouseDown={e => handleTemplateResizeStart(e, 'n')}
              />
              <div
                className="absolute w-3 h-3 rounded-[2px] pointer-events-auto cursor-ns-resize hover:scale-125 transition-transform"
                style={{ backgroundColor: '#ffffff', border: '2px solid #3ecf8e', bottom: -14, left: '50%', transform: 'translateX(-50%)' }}
                data-resize-handle
                onMouseDown={e => handleTemplateResizeStart(e, 's')}
              />
              <div
                className="absolute w-3 h-3 rounded-[2px] pointer-events-auto cursor-ew-resize hover:scale-125 transition-transform"
                style={{ backgroundColor: '#ffffff', border: '2px solid #3ecf8e', right: -14, top: '50%', transform: 'translateY(-50%)' }}
                data-resize-handle
                onMouseDown={e => handleTemplateResizeStart(e, 'e')}
              />
              <div
                className="absolute w-3 h-3 rounded-[2px] pointer-events-auto cursor-ew-resize hover:scale-125 transition-transform"
                style={{ backgroundColor: '#ffffff', border: '2px solid #3ecf8e', left: -14, top: '50%', transform: 'translateY(-50%)' }}
                data-resize-handle
                onMouseDown={e => handleTemplateResizeStart(e, 'w')}
              />

            </div>
          )}
        </div>
      </div>

      {/* ── Floating draggable toolbar ── */}
      {toolbarPos && (
        <div
          data-toolbar
          className="absolute z-50 flex items-center gap-0.5 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl shadow-2xl px-2 py-1.5"
          style={{ left: toolbarPos.x, top: toolbarPos.y, userSelect: 'none' }}
          onMouseDown={handleToolbarMouseDown}
        >
          {/* Grip handle */}
          <div
            data-grip
            className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing px-1 mr-1"
            title="Drag to move"
          >
            <GripHorizontal className="w-3.5 h-3.5" />
          </div>

          {/* Zoom out */}
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            onClick={() => zoomTo(scale - 0.1)}
            title="Zoom out (Ctrl –)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>

          {/* Zoom % with preset dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-0.5 text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg px-2 h-7 min-w-[58px] justify-center transition-colors"
              onClick={() => setShowZoomMenu(v => !v)}
              title="Zoom presets"
            >
              {Math.round(scale * 100)}%
              <ChevronDown className="w-2.5 h-2.5 opacity-50" />
            </button>
            {showZoomMenu && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card border border-border/50 rounded-lg shadow-2xl py-1 min-w-[90px] z-60">
                {ZOOM_PRESETS.map(p => (
                  <button
                    key={p}
                    className={`w-full text-left px-3 py-1 text-xs hover:bg-muted transition-colors ${Math.round(scale * 100) === Math.round(p * 100) ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => zoomTo(p)}
                  >
                    {Math.round(p * 100)}%
                  </button>
                ))}
                <div className="border-t border-border/40 my-1" />
                <button
                  className="w-full text-left px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  onClick={fitToScreen}
                >
                  Fit to screen
                </button>
              </div>
            )}
          </div>

          {/* Zoom in */}
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            onClick={() => zoomTo(scale + 0.1)}
            title="Zoom in (Ctrl +)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Fit to screen */}
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            onClick={fitToScreen}
            title="Fit to screen (Ctrl+0)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>

          {/* Reset */}
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            onClick={() => { onScaleChange(1); setPan({ x: 0, y: 0 }); }}
            title="Reset to 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Snap to grid */}
          <Button
            variant="ghost" size="icon"
            className={`h-7 w-7 rounded-lg transition-colors ${snapToGrid ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
            onClick={() => setSnapToGrid(v => !v)}
            title="Snap to grid (S)"
          >
            <Magnet className="w-3.5 h-3.5" />
          </Button>

          {onPreviewToggle && (
            <>
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant="ghost" size="icon"
                className={`h-7 w-7 rounded-lg transition-colors ${previewOpen ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                onClick={onPreviewToggle}
                title={previewOpen ? 'Exit preview' : 'Preview certificate'}
              >
                {previewOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Canvas info bar (bottom-left) ── */}
      <div className="absolute bottom-3 left-3 z-40 flex items-center gap-2 text-[10px] text-muted-foreground/50 select-none pointer-events-none">
        <span>{Math.round(visualDims?.w ?? pdfWidth)} × {Math.round(visualDims?.h ?? pdfHeight)}</span>
        <span className="w-px h-2.5 bg-border" />
        <span>{visibleFields.length} field{visibleFields.length !== 1 ? 's' : ''}</span>
        {snapToGrid && (
          <>
            <span className="w-px h-2.5 bg-border" />
            <span className="text-primary/70">Snap {SNAP_SIZE}px</span>
          </>
        )}
      </div>

      {/* ── Keyboard hint (bottom-right) ── */}
      <div className="absolute bottom-3 right-3 z-40 text-[9px] text-muted-foreground/30 select-none pointer-events-none text-right leading-relaxed">
        Scroll to pan · Pinch / Ctrl+Scroll to zoom · Space+Drag to pan
      </div>
    </div>
  );
}
