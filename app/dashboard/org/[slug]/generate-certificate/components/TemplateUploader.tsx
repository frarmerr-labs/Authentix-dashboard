'use client';

import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileCheck,
  X,
  Figma,
  ImageIcon,
  AlertTriangle,
} from 'lucide-react';

// ── Supported formats ─────────────────────────────────────────────────────────
// We accept every major image format. Sharp on the backend handles the rest.
const ACCEPTED_IMAGE_TYPES: Record<string, string[]> = {
  'image/png':  ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'image/avif': ['.avif'],
  'image/gif':  ['.gif'],
  'image/bmp':  ['.bmp'],
  'image/tiff': ['.tif', '.tiff'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
};

const FORMAT_LABELS = ['PNG', 'JPG', 'WebP', 'SVG', 'AVIF', 'GIF', 'BMP', 'TIFF', 'HEIC'];

// ── PDF coming-soon modal ─────────────────────────────────────────────────────
function PdfModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>

          <div>
            <h3 className="font-semibold text-lg">PDF templates coming soon</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              We&apos;re still building PDF template support. We&apos;ll let you know as soon as it&apos;s ready!
            </p>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              In the meantime, export your design as a{' '}
              <span className="font-medium text-foreground">PNG or JPG</span> from Canva,
              Figma, or Adobe — we&apos;ll handle the rest at the highest quality.
            </p>
          </div>

          <div className="w-full rounded-xl bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">How to export from popular tools:</p>
            <div className="space-y-1 text-xs text-left">
              <p><span className="font-medium">Canva →</span> Share → Download → PNG</p>
              <p><span className="font-medium">Figma →</span> Right-click frame → Export as PNG</p>
              <p><span className="font-medium">Illustrator →</span> File → Export → Export As → PNG</p>
              <p><span className="font-medium">Photoshop →</span> File → Export → Export As → PNG</p>
            </div>
          </div>

          <Button onClick={onClose} className="w-full">Got it, I'll use an image</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TemplateUploaderProps {
  onUpload: (file: File, width: number, height: number) => void;
}

export function TemplateUploader({ onUpload }: TemplateUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processImageFile = useCallback(
    (file: File) => {
      setIsProcessing(true);
      setError(null);

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        onUpload(file, img.naturalWidth, img.naturalHeight);
        setIsProcessing(false);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        setError('Could not read this image. Make sure the file isn\'t corrupted and try again.');
        setIsProcessing(false);
      };

      img.src = url;
    },
    [onUpload],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      // Check if a PDF was dropped — show coming-soon modal instead of an error
      const droppedPdf = rejectedFiles.find(r =>
        r.file?.type === 'application/pdf' ||
        r.file?.name?.toLowerCase().endsWith('.pdf'),
      );
      if (droppedPdf) {
        setShowPdfModal(true);
        return;
      }

      if (rejectedFiles.length > 0) {
        const code = rejectedFiles[0]?.errors?.[0]?.code;
        setError(
          code === 'file-too-large'
            ? 'This file is too large. Please keep templates under 50 MB.'
            : 'That file type isn\'t supported. Use PNG, JPG, WebP, or any other image format.',
        );
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;
      processImageFile(file);
    },
    [processImageFile],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      ...ACCEPTED_IMAGE_TYPES,
      // Let PDF through to the rejected handler so we can show the modal
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    disabled: isProcessing,
    noClick: true, // we control the button ourselves
  });

  return (
    <>
      {showPdfModal && <PdfModal onClose={() => setShowPdfModal(false)} />}

      <div
        {...getRootProps()}
        className={[
          'border-2 border-dashed rounded-xl p-8 transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-default',
        ].join(' ')}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4 text-center">
          {isProcessing ? (
            <>
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Processing image…</p>
            </>
          ) : isDragActive ? (
            <>
              <FileCheck className="w-12 h-12 text-primary" />
              <p className="text-sm font-medium">Drop your image here</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <ImageIcon className="w-7 h-7 text-muted-foreground" />
              </div>

              <div>
                <p className="text-sm font-semibold">Upload your certificate template</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag & drop or click the button below
                </p>
              </div>

              {/* Format pills */}
              <div className="flex flex-wrap justify-center gap-1.5">
                {FORMAT_LABELS.map(fmt => (
                  <span
                    key={fmt}
                    className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
                  >
                    {fmt}
                  </span>
                ))}
              </div>

              {/* Tool hints */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Figma className="w-3 h-3" /> Figma
                </span>
                <span>·</span>
                <span>Canva</span>
                <span>·</span>
                <span>Illustrator</span>
                <span>·</span>
                <span>Photoshop</span>
                <span>·</span>
                <span>AI tools</span>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={open} disabled={isProcessing}>
                <Upload className="w-4 h-4 mr-2" />
                Choose Image
              </Button>

              <p className="text-[10px] text-muted-foreground">
                Max 50 MB · Best quality is preserved — no compression
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-destructive">{error}</p>
              <button
                className="text-[10px] text-destructive/70 underline mt-1"
                onClick={() => navigator.clipboard.writeText(error)}
              >
                Copy error
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
