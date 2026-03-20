'use client';

import { createPortal } from 'react-dom';
import { CertificateField, FontWeight, CERTIFICATE_FONTS, PRESET_COLORS, DATE_FORMATS } from '@/lib/types/certificate';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlignLeft, AlignCenter, AlignRight, Italic, GripHorizontal, X, ChevronDown, MoveHorizontal, MoveVertical, ArrowLeftRight, ArrowUpDown, Upload, Image as ImageIcon } from 'lucide-react';
import { RgbaColorPicker } from 'react-colorful';
import { useState, useRef, useEffect } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────────

const FONT_WEIGHTS: { label: string; value: FontWeight }[] = [
  { label: 'Thin', value: '100' },
  { label: 'Extra Light', value: '200' },
  { label: 'Light', value: '300' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semi Bold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extra Bold', value: '800' },
  { label: 'Black', value: '900' },
];

const FONT_SIZE_PRESETS = [8, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96];

function normalizeFontWeight(w: string): FontWeight {
  if (w === 'normal') return '400';
  if (w === 'bold') return '700';
  return w as FontWeight;
}

const CHECKER = 'repeating-conic-gradient(#c0c0c0 0% 25%, #fff 0% 50%) 0 0 / 8px 8px';
const INP = 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-xs';

// ── Colour helpers ─────────────────────────────────────────────────────────────

function hexToRgba(hex: string, opacity: number) {
  const h = hex.replace('#', '').padEnd(6, '0');
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
    a: parseFloat((Math.max(0, Math.min(100, opacity)) / 100).toFixed(2)),
  };
}

function rgbaToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

// ── Primitives ─────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2.5 border-t border-border/30">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 select-none">
        {label}
      </p>
      {children}
    </div>
  );
}

function NumBox({
  label, value, onChange, unit, min, max, step, icon, className = '',
}: {
  label: string; value: number; onChange: (v: number) => void;
  unit?: string; min?: number; max?: number; step?: number;
  icon?: React.ReactNode; className?: string;
}) {
  return (
    <div className={`flex items-center ${INP} h-7 px-2 gap-1 ${className}`}>
      <span className="text-[10px] text-muted-foreground/60 shrink-0 select-none">{label}</span>
      <input
        type="number" value={Math.round(value * 100) / 100}
        min={min} max={max} step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 min-w-0 bg-transparent text-xs outline-none text-foreground"
      />
      {unit && <span className="text-[9px] text-muted-foreground/50 shrink-0 select-none">{unit}</span>}
      {icon && <span className="shrink-0 text-muted-foreground/35 ml-0.5">{icon}</span>}
    </div>
  );
}

/** Font size input with preset dropdown */
function FontSizeBox({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOut = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center ${INP} h-7 overflow-hidden`}>
        <span className="text-[10px] text-muted-foreground/60 shrink-0 select-none px-2">Size</span>
        <input
          type="number" value={Math.round(value)}
          onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
          className="flex-1 min-w-0 bg-transparent text-xs outline-none text-foreground"
        />
        <span className="text-[9px] text-muted-foreground/50 shrink-0 select-none pr-1">px</span>
        <button
          className="h-full px-1.5 border-l border-gray-200 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-0.5 bg-card border border-border/50 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            {FONT_SIZE_PRESETS.map((s) => (
              <button
                key={s}
                className={`w-full text-left px-2.5 py-1 text-xs hover:bg-muted transition-colors ${Math.round(value) === s ? 'text-primary font-semibold' : 'text-foreground'}`}
                onClick={() => { onChange(s); setOpen(false); }}
              >
                {s} px
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  name: 'Name', course: 'Course', start_date: 'Date',
  end_date: 'Date', custom_text: 'Text', qr_code: 'QR Code', image: 'Image',
};

// ── Floating colour picker ─────────────────────────────────────────────────────

type ColorTarget = 'main' | 'shadow' | 'stroke';

function FloatingColorPicker({
  color, label, initialPos, onClose, onChange,
}: {
  color: { r: number; g: number; b: number; a: number };
  label: string;
  initialPos: { x: number; y: number };
  onClose: () => void;
  onChange: (c: { r: number; g: number; b: number; a: number }) => void;
}) {
  const [pos, setPos] = useState(initialPos);
  const dragOrigin = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragOrigin.current) return;
      setPos({ x: dragOrigin.current.px + (e.clientX - dragOrigin.current.mx), y: dragOrigin.current.py + (e.clientY - dragOrigin.current.my) });
    };
    const onUp = () => { dragOrigin.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  return (
    <div className="fixed z-[9999] bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden select-none" style={{ left: pos.x, top: pos.y, width: 232 }}>
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border/30 cursor-grab active:cursor-grabbing bg-muted/20"
        onMouseDown={(e) => { e.preventDefault(); dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }; }}
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
        <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted" onClick={onClose} onMouseDown={(e) => e.stopPropagation()}>
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
      <div className="p-3 cp-compact">
        <RgbaColorPicker color={color} onChange={onChange} style={{ width: '100%' }} />
      </div>
      <div className="px-3 pb-3 pt-0.5 border-t border-border/30">
        <p className="text-[9px] text-muted-foreground/60 mb-1.5 select-none pt-2">Presets</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((preset) => (
            <button key={preset.value} title={preset.name}
              className="w-5 h-5 rounded-full border-2 border-transparent hover:border-primary/60 hover:scale-110 transition-all shrink-0"
              style={{ backgroundColor: preset.value }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onChange({ ...hexToRgba(preset.value, 100), a: 1 })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Preload Google Fonts
const googleFonts = CERTIFICATE_FONTS.filter((f): f is typeof f & { googleFont: true } => 'googleFont' in f && f.googleFont === true);
const PRELOAD_URL = `https://fonts.googleapis.com/css2?${googleFonts.map((f) => `family=${encodeURIComponent(f.value)}:wght@400`).join('&')}&display=swap`;

// ── QR Logo Uploader ──────────────────────────────────────────────────────────

function QRLogoUploader({
  logoUrl,
  onLogoChange,
}: {
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    onLogoChange(url);
  };

  return (
    <div>
      <p className="text-[9px] text-muted-foreground/50 mb-1.5 select-none">QR Logo</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
      {logoUrl ? (
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10 rounded border border-border/50 overflow-hidden bg-white shrink-0">
            <img src={logoUrl} alt="QR logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-[10px] text-primary hover:text-primary/80 text-left transition-colors"
            >
              Replace
            </button>
            <button
              onClick={() => onLogoChange(null)}
              className="text-[10px] text-destructive/70 hover:text-destructive text-left transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className="border border-dashed border-border/50 rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
        >
          <Upload className="w-4 h-4 text-muted-foreground/50 mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground/60">Click or drag image</p>
        </div>
      )}
    </div>
  );
}

// ── Props & Main Component ─────────────────────────────────────────────────────

interface RightPanelProps {
  selectedField: CertificateField | undefined;
  onFieldUpdate: (updates: Partial<CertificateField>) => void;
}

type EffectType = 'none' | 'drop_shadow' | 'layer_blur' | 'background_blur';

export function RightPanel({ selectedField, onFieldUpdate }: RightPanelProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<ColorTarget>('main');
  const [pickerInitialPos, setPickerInitialPos] = useState({ x: 0, y: 0 });
  const [hexInput, setHexInput] = useState('');
  const [hexFocused, setHexFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<EffectType>('none');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const id = 'gf-preload-all';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet'; link.href = PRELOAD_URL;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!selectedField) return;
    const font = CERTIFICATE_FONTS.find((f) => f.value === selectedField.fontFamily);
    if (!font || !('googleFont' in font) || !font.googleFont) return;
    const id = `gf-${font.value.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.value)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
  }, [selectedField?.fontFamily]);

  if (!selectedField) return null;

  const isDateField = selectedField.type === 'start_date' || selectedField.type === 'end_date';
  const isQRCode = selectedField.type === 'qr_code';
  const isImage = selectedField.type === 'image';
  const typeLabel = TYPE_LABEL[selectedField.type] ?? selectedField.type;
  const opacity = Math.round(selectedField.opacity ?? 100);
  const displayHex = selectedField.color.replace('#', '').toUpperCase();

  const openPicker = (target: ColorTarget, el: HTMLElement) => {
    setPickerTarget(target);
    const rect = el.getBoundingClientRect();
    setPickerInitialPos({ x: Math.max(8, rect.left - 232 - 24), y: Math.max(8, Math.min(window.innerHeight - 360, rect.top - 40)) });
    setShowPicker(true);
  };

  const handlePickerChange = (c: { r: number; g: number; b: number; a: number }) => {
    if (pickerTarget === 'shadow') {
      const prev = selectedField.textShadow ?? { offsetX: 2, offsetY: 2, blur: 4, color: '#000000' };
      onFieldUpdate({ textShadow: { ...prev, color: rgbaToHex(c) } });
    } else if (pickerTarget === 'stroke') {
      onFieldUpdate({ strokeColor: rgbaToHex(c) });
    } else {
      onFieldUpdate({ color: rgbaToHex(c), opacity: Math.round(c.a * 100) });
    }
  };

  const commitHex = (raw: string) => {
    const clean = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    if (clean.length === 6) onFieldUpdate({ color: `#${clean}` });
  };

  const selCls = `h-7 text-xs ${INP}`;
  const activeBtn = 'bg-primary/15 text-primary border-primary/30';
  const inactiveBtn = `bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-muted-foreground hover:text-foreground`;
  const btn = (active: boolean) => `h-7 flex items-center justify-center rounded border transition-colors ${active ? activeBtn : inactiveBtn}`;

  return (
    <div className="flex flex-col">

      {/* ── Field type + label ── */}
      <div className="px-3 py-2.5 flex items-center gap-2 shrink-0">
        <span className="text-[8px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded select-none shrink-0">
          {typeLabel}
        </span>
        <input value={selectedField.label} onChange={(e) => onFieldUpdate({ label: e.target.value })}
          className="flex-1 bg-transparent text-xs font-medium outline-none text-foreground placeholder:text-muted-foreground min-w-0"
          placeholder="Field label" />
      </div>

      {/* ── Position ── */}
      <Section label="Position">
        <div className="grid grid-cols-2 gap-2">
          <NumBox label="X" value={selectedField.x} onChange={(v) => onFieldUpdate({ x: v })} icon={<MoveHorizontal className="w-3 h-3" />} />
          <NumBox label="Y" value={selectedField.y} onChange={(v) => onFieldUpdate({ y: v })} icon={<MoveVertical className="w-3 h-3" />} />
        </div>
      </Section>

      {/* ── Dimensions ── */}
      <Section label="Dimensions">
        <div className="grid grid-cols-2 gap-2">
          <NumBox label="W" value={selectedField.width} onChange={(v) => onFieldUpdate({ width: v })} icon={<ArrowLeftRight className="w-3 h-3" />} />
          <NumBox label="H" value={selectedField.height} onChange={(v) => onFieldUpdate({ height: v })} icon={<ArrowUpDown className="w-3 h-3" />} />
        </div>
      </Section>

      {/* ── Typography ── */}
      {!isQRCode && !isImage && (
        <Section label="Typography">
          <div className="space-y-2">

            {/* Font family */}
            <Select value={selectedField.fontFamily} onValueChange={(v) => onFieldUpdate({ fontFamily: v })}>
              <SelectTrigger className={`${selCls} w-full`}><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-56">
                {CERTIFICATE_FONTS.map((font) => (
                  <SelectItem key={font.value} value={font.value} className="text-xs">
                    <span style={{ fontFamily: font.value }}>{font.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Font weight + Italic */}
            <div className="flex items-center gap-2">
              <Select value={normalizeFontWeight(selectedField.fontWeight)} onValueChange={(v) => onFieldUpdate({ fontWeight: v as FontWeight })}>
                <SelectTrigger className={`${selCls} flex-1 min-w-0`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_WEIGHTS.map((fw) => (
                    <SelectItem key={fw.value} value={fw.value} className="text-xs">{fw.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button title="Italic" className={`${btn(selectedField.fontStyle === 'italic')} w-7 shrink-0`}
                onClick={() => onFieldUpdate({ fontStyle: selectedField.fontStyle === 'italic' ? 'normal' : 'italic' })}>
                <Italic className="w-3 h-3" />
              </button>
            </div>

            {/* Font size with preset dropdown */}
            <FontSizeBox value={selectedField.fontSize} onChange={(v) => onFieldUpdate({ fontSize: v })} />

            {/* Letter spacing + Line height */}
            <div className="grid grid-cols-2 gap-2">
              <NumBox label="Letter Space" value={selectedField.letterSpacing ?? 0}
                onChange={(v) => onFieldUpdate({ letterSpacing: v })} unit="px" step={0.5} />
              <NumBox label="Line Height" value={selectedField.lineHeight ?? 1.2}
                onChange={(v) => onFieldUpdate({ lineHeight: Math.max(0.5, v) })} step={0.1} />
            </div>

            {/* Alignment + Text transform */}
            <div className="space-y-1.5">
              <p className="text-[9px] text-muted-foreground/50 select-none">Alignment</p>
              <div className="flex items-center gap-1.5">
                {(['left', 'center', 'right'] as const).map((align) => {
                  const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                  return (
                    <button key={align} title={`Align ${align}`} className={`${btn(selectedField.textAlign === align)} flex-1`}
                      onClick={() => onFieldUpdate({ textAlign: align })}>
                      <Icon className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-muted-foreground/50 select-none mt-1">Transform</p>
              <div className="flex items-center gap-1.5">
                {([{ v: 'uppercase', l: 'AA' }, { v: 'lowercase', l: 'aa' }, { v: 'capitalize', l: 'Aa' }] as const).map((t) => (
                  <button key={t.v} title={t.v}
                    className={`${btn(selectedField.textTransform === t.v)} flex-1 text-[10px] font-medium`}
                    onClick={() => onFieldUpdate({ textTransform: selectedField.textTransform === t.v ? 'none' : t.v })}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </Section>
      )}

      {/* ── Appearance ── */}
      <Section label="Appearance">
        {isImage ? (
          <div className="grid grid-cols-2 gap-2">
            <NumBox label="Opacity" value={opacity} min={0} max={100} unit="%"
              onChange={(v) => onFieldUpdate({ opacity: v })} />
            <NumBox label="Corner" value={selectedField.cornerRadius ?? 0} min={0} max={500} unit="px"
              onChange={(v) => onFieldUpdate({ cornerRadius: v })} />
          </div>
        ) : isQRCode ? (
          <div className="space-y-2.5">
            {/* QR style dropdown */}
            <div>
              <p className="text-[9px] text-muted-foreground/50 mb-1.5 select-none">Design Style</p>
              <div className={`flex items-center ${INP} overflow-hidden`} style={{ height: '28px' }}>
                <select
                  value={selectedField.qrStyle ?? 'standard'}
                  onChange={(e) => onFieldUpdate({ qrStyle: e.target.value as CertificateField['qrStyle'] })}
                  className="flex-1 min-w-0 bg-transparent text-xs outline-none text-foreground px-2"
                >
                  <option value="standard">Standard (Square)</option>
                  <option value="rounded">Rounded</option>
                  <option value="dots">Dots</option>
                  <option value="classy">Classy</option>
                  <option value="logo">With Logo</option>
                </select>
              </div>
            </div>
            {/* QR color */}
            <div>
              <p className="text-[9px] text-muted-foreground/50 mb-1.5 select-none">Module Color</p>
              <div className={`flex items-stretch ${INP} overflow-hidden`} style={{ height: '30px' }}>
                <button title="Pick colour"
                  className="w-9 shrink-0 flex items-center justify-center border-r border-gray-200 dark:border-white/10 hover:opacity-80 transition-opacity"
                  onClick={(e) => openPicker('main', e.currentTarget)}>
                  <span className="relative w-5 h-5 rounded-[4px] overflow-hidden" style={{ background: CHECKER }}>
                    <span className="absolute inset-0" style={{ backgroundColor: selectedField.color }} />
                  </span>
                </button>
                <span className="text-[10px] text-muted-foreground/50 flex items-center px-1 shrink-0">#</span>
                <input value={hexFocused ? hexInput : displayHex}
                  onFocus={() => { setHexFocused(true); setHexInput(displayHex); }}
                  onBlur={(e) => { setHexFocused(false); commitHex(e.target.value); }}
                  onChange={(e) => setHexInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { commitHex(hexInput); (e.target as HTMLInputElement).blur(); } }}
                  className="flex-1 min-w-0 bg-transparent text-xs font-mono uppercase outline-none"
                  maxLength={6} spellCheck={false} placeholder="000000" />
              </div>
            </div>
            {/* Transparent background */}
            <div className="flex items-center justify-between">
              <p className="text-[9px] text-muted-foreground/50 select-none">Transparent Background</p>
              <button
                className="relative rounded-full transition-colors shrink-0"
                style={{ width: '28px', height: '14px', backgroundColor: selectedField.qrTransparentBg ? 'var(--primary)' : 'var(--border)' }}
                onClick={() => onFieldUpdate({ qrTransparentBg: !selectedField.qrTransparentBg })}
              >
                <span className="absolute bg-white rounded-full shadow-sm transition-all"
                  style={{ width: '10px', height: '10px', top: '2px', left: selectedField.qrTransparentBg ? 'calc(100% - 12px)' : '2px' }} />
              </button>
            </div>
            {/* Logo upload (logo style only) */}
            {selectedField.qrStyle === 'logo' && (
              <QRLogoUploader
                logoUrl={selectedField.qrLogoUrl ?? null}
                onLogoChange={(url) => onFieldUpdate({ qrLogoUrl: url ?? undefined })}
              />
            )}
            {/* Opacity */}
            <NumBox label="Opacity" value={opacity} min={0} max={100} unit="%" onChange={(v) => onFieldUpdate({ opacity: v })} />
          </div>
        ) : (
          <div className="space-y-2.5">

            {/* Colour row */}
            <div>
              <p className="text-[9px] text-muted-foreground/50 mb-1.5 select-none">Color</p>
              <div className={`flex items-stretch ${INP} overflow-hidden`} style={{ height: '30px' }}>
                <button title="Pick colour"
                  className="w-9 shrink-0 flex items-center justify-center border-r border-gray-200 dark:border-white/10 hover:opacity-80 transition-opacity"
                  onClick={(e) => openPicker('main', e.currentTarget)}>
                  <span className="relative w-5 h-5 rounded-[4px] overflow-hidden" style={{ background: CHECKER }}>
                    <span className="absolute inset-0" style={{ backgroundColor: selectedField.color, opacity: opacity / 100 }} />
                  </span>
                </button>
                <span className="text-[10px] text-muted-foreground/50 flex items-center px-1 shrink-0">#</span>
                <input value={hexFocused ? hexInput : displayHex}
                  onFocus={() => { setHexFocused(true); setHexInput(displayHex); }}
                  onBlur={(e) => { setHexFocused(false); commitHex(e.target.value); }}
                  onChange={(e) => setHexInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { commitHex(hexInput); (e.target as HTMLInputElement).blur(); } }}
                  className="flex-1 min-w-0 bg-transparent text-xs font-mono uppercase outline-none"
                  maxLength={6} spellCheck={false} placeholder="000000" />
                <span className="w-px bg-gray-200 dark:bg-white/10 shrink-0 my-1" />
                <input type="number" min={0} max={100} value={opacity}
                  onChange={(e) => onFieldUpdate({ opacity: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                  className="w-7 bg-transparent text-xs text-right outline-none" />
                <span className="text-[10px] text-muted-foreground/50 flex items-center pr-1.5 shrink-0">%</span>
              </div>
            </div>

            {/* Text shadow */}
            <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] text-muted-foreground/50 select-none">Text Shadow</p>
                  <button
                    className="relative rounded-full transition-colors shrink-0"
                    style={{ width: '28px', height: '14px', backgroundColor: selectedField.textShadow ? 'var(--primary)' : 'var(--border)' }}
                    onClick={() => onFieldUpdate({ textShadow: selectedField.textShadow ? null : { offsetX: 2, offsetY: 2, blur: 4, color: '#000000' } })}
                  >
                    <span className="absolute bg-white rounded-full shadow-sm transition-all"
                      style={{ width: '10px', height: '10px', top: '2px', left: selectedField.textShadow ? 'calc(100% - 12px)' : '2px' }} />
                  </button>
                </div>
                {selectedField.textShadow && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <NumBox label="X" value={selectedField.textShadow.offsetX}
                        onChange={(v) => onFieldUpdate({ textShadow: { ...selectedField.textShadow!, offsetX: v } })} unit="px" />
                      <NumBox label="Y" value={selectedField.textShadow.offsetY}
                        onChange={(v) => onFieldUpdate({ textShadow: { ...selectedField.textShadow!, offsetY: v } })} unit="px" />
                      <NumBox label="Blur" value={selectedField.textShadow.blur} min={0}
                        onChange={(v) => onFieldUpdate({ textShadow: { ...selectedField.textShadow!, blur: Math.max(0, v) } })} unit="px" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="relative w-7 h-7 shrink-0 rounded border border-gray-200 dark:border-white/10 overflow-hidden hover:border-primary/50"
                        style={{ background: CHECKER }} onClick={(e) => openPicker('shadow', e.currentTarget)}>
                        <span className="absolute inset-0" style={{ backgroundColor: selectedField.textShadow.color }} />
                      </button>
                      <span className="text-xs text-muted-foreground">Shadow color</span>
                    </div>
                  </div>
                )}
              </div>

          </div>
        )}
      </Section>

      {/* ── Stroke (image fields only) ── */}
      {isImage && (
        <Section label="Stroke">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[9px] text-muted-foreground/50 select-none">Stroke</p>
              <button
                className="relative rounded-full transition-colors shrink-0"
                style={{ width: '28px', height: '14px', backgroundColor: selectedField.strokeWidth ? 'var(--primary)' : 'var(--border)' }}
                onClick={() => onFieldUpdate({ strokeWidth: selectedField.strokeWidth ? 0 : 2, strokeColor: selectedField.strokeColor || '#000000', strokePosition: selectedField.strokePosition || 'center' })}
              >
                <span className="absolute bg-white rounded-full shadow-sm transition-all"
                  style={{ width: '10px', height: '10px', top: '2px', left: selectedField.strokeWidth ? 'calc(100% - 12px)' : '2px' }} />
              </button>
            </div>
            {!!selectedField.strokeWidth && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <NumBox label="Weight" value={selectedField.strokeWidth ?? 2} min={0} max={50}
                    onChange={(v) => onFieldUpdate({ strokeWidth: v })} unit="px" />
                  {/* Color swatch inline */}
                  <button
                    className="flex items-center gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded h-7 px-2 hover:opacity-80 transition-opacity"
                    onClick={(e) => openPicker('stroke', e.currentTarget)}
                  >
                    <span className="relative w-4 h-4 rounded-[3px] overflow-hidden shrink-0" style={{ background: CHECKER }}>
                      <span className="absolute inset-0" style={{ backgroundColor: selectedField.strokeColor || '#000000' }} />
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 font-mono uppercase">{(selectedField.strokeColor || '#000000').replace('#','')}</span>
                  </button>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground/50 mb-1.5 select-none">Position</p>
                  <div className="flex items-center gap-1.5">
                    {(['inside', 'center', 'outside'] as const).map((pos) => (
                      <button key={pos}
                        className={`${btn(selectedField.strokePosition === pos)} flex-1 text-[10px] capitalize`}
                        onClick={() => onFieldUpdate({ strokePosition: pos })}>
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Effects (image fields only) ── */}
      {isImage && (
        <Section label="Effects">
          <div className="space-y-3">
            {/* Effect type selector */}
            <div className={`flex items-center ${INP} overflow-hidden`} style={{ height: '28px' }}>
              <span className="text-[10px] text-muted-foreground/60 shrink-0 select-none px-2">Effect</span>
              <select
                value={selectedEffect}
                onChange={(e) => {
                  const next = e.target.value as EffectType;
                  setSelectedEffect(next);
                  // Auto-enable the effect with defaults when switching to it
                  if (next === 'drop_shadow' && !selectedField.dropShadow) {
                    onFieldUpdate({ dropShadow: { offsetX: 4, offsetY: 4, blur: 8, spread: 0, color: '#00000066' } });
                  }
                }}
                className="flex-1 min-w-0 bg-transparent text-xs outline-none text-foreground pr-1"
              >
                <option value="none">None</option>
                <option value="drop_shadow">Drop Shadow</option>
                <option value="layer_blur">Layer Blur</option>
                <option value="background_blur">Background Blur</option>
              </select>
            </div>

            {/* Drop Shadow options */}
            {selectedEffect === 'drop_shadow' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] text-muted-foreground/50 select-none">Drop Shadow</p>
                  <button
                    className="relative rounded-full transition-colors"
                    style={{ width: '28px', height: '14px', backgroundColor: selectedField.dropShadow ? 'var(--primary)' : 'var(--border)' }}
                    onClick={() => onFieldUpdate({ dropShadow: selectedField.dropShadow ? null : { offsetX: 4, offsetY: 4, blur: 8, spread: 0, color: '#00000066' } })}
                  >
                    <span className="absolute bg-white rounded-full shadow-sm transition-all"
                      style={{ width: '10px', height: '10px', top: '2px', left: selectedField.dropShadow ? 'calc(100% - 12px)' : '2px' }} />
                  </button>
                </div>
                {selectedField.dropShadow && (
                  <div className="grid grid-cols-2 gap-2">
                    <NumBox label="X" value={selectedField.dropShadow.offsetX} unit="px"
                      onChange={(v) => onFieldUpdate({ dropShadow: { ...selectedField.dropShadow!, offsetX: v } })} />
                    <NumBox label="Y" value={selectedField.dropShadow.offsetY} unit="px"
                      onChange={(v) => onFieldUpdate({ dropShadow: { ...selectedField.dropShadow!, offsetY: v } })} />
                    <NumBox label="Blur" value={selectedField.dropShadow.blur} min={0} unit="px"
                      onChange={(v) => onFieldUpdate({ dropShadow: { ...selectedField.dropShadow!, blur: v } })} />
                    <NumBox label="Spread" value={selectedField.dropShadow.spread} unit="px"
                      onChange={(v) => onFieldUpdate({ dropShadow: { ...selectedField.dropShadow!, spread: v } })} />
                  </div>
                )}
              </div>
            )}

            {/* Layer Blur options */}
            {selectedEffect === 'layer_blur' && (
              <div className="flex items-center gap-2">
                <p className="text-[9px] text-muted-foreground/50 select-none flex-1">Blur</p>
                <NumBox label="" value={selectedField.layerBlur ?? 0} min={0} max={100} unit="px" className="w-24"
                  onChange={(v) => onFieldUpdate({ layerBlur: v })} />
              </div>
            )}

            {/* Background Blur options */}
            {selectedEffect === 'background_blur' && (
              <div className="flex items-center gap-2">
                <p className="text-[9px] text-muted-foreground/50 select-none flex-1">Blur</p>
                <NumBox label="" value={selectedField.backgroundBlur ?? 0} min={0} max={100} unit="px" className="w-24"
                  onChange={(v) => onFieldUpdate({ backgroundBlur: v })} />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Content ── */}
      <Section label="Content">
        <div className="space-y-2">
          {isDateField && (
            <Select
              value={selectedField.dateFormat || 'MMMM dd, yyyy'}
              onValueChange={(v) => {
                const fmt = DATE_FORMATS.find(f => f.value === v);
                onFieldUpdate({ dateFormat: v, sampleValue: fmt?.example ?? v });
              }}
            >
              <SelectTrigger className={`${selCls} w-full`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value} className="text-xs">
                    {fmt.label} <span className="text-muted-foreground ml-1">({fmt.example})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className={`flex items-center gap-2 ${INP} h-7 px-2`}>
            <span className="text-[10px] text-muted-foreground/60 shrink-0 select-none">Sample</span>
            <input value={selectedField.sampleValue || ''} onChange={(e) => onFieldUpdate({ sampleValue: e.target.value })}
              className="flex-1 min-w-0 bg-transparent text-xs font-mono outline-none" placeholder={selectedField.label} />
          </div>
          {!isQRCode && (
            <div className="grid grid-cols-2 gap-2">
              {(['prefix', 'suffix'] as const).map((key) => (
                <div key={key} className={`flex items-center gap-1 ${INP} h-7 px-2`}>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0 select-none">{key === 'prefix' ? 'Pre' : 'Suf'}</span>
                  <input value={selectedField[key] || ''} onChange={(e) => onFieldUpdate({ [key]: e.target.value })}
                    className="flex-1 min-w-0 bg-transparent text-xs outline-none" placeholder={key === 'prefix' ? 'Prefix' : 'Suffix'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <div className="h-6 shrink-0" />

      {/* ── Floating colour picker ── */}
      {mounted && showPicker && createPortal(
        <FloatingColorPicker
          color={
            pickerTarget === 'shadow'
              ? hexToRgba(selectedField.textShadow?.color ?? '#000000', 100)
              : pickerTarget === 'stroke'
              ? hexToRgba(selectedField.strokeColor ?? '#000000', 100)
              : hexToRgba(selectedField.color, opacity)
          }
          label={pickerTarget === 'shadow' ? 'Shadow Color' : pickerTarget === 'stroke' ? 'Stroke Color' : 'Color'}
          initialPos={pickerInitialPos}
          onClose={() => setShowPicker(false)}
          onChange={handlePickerChange}
        />,
        document.body
      )}
    </div>
  );
}
