'use client';

import { useEffect, useState } from 'react';

interface PDFViewerProps {
  fileUrl: string;
  pageNumber: number;
  width: number;
}

export function PDFViewer({ fileUrl, pageNumber, width }: PDFViewerProps) {
  const [ReactPDF, setReactPDF] = useState<{
    Document: React.ComponentType<{ file: string; loading?: React.ReactNode; error?: React.ReactNode; children?: React.ReactNode }>;
    Page: React.ComponentType<{ pageNumber: number; width: number; renderTextLayer?: boolean; renderAnnotationLayer?: boolean; className?: string }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPDF = async () => {
      try {
        const reactPdf = await import('react-pdf');

        // Configure worker using local file from public directory
        // This is more reliable than CDN and avoids CORS/fetch issues
        reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        if (mounted) {
          setReactPDF({
            Document: reactPdf.Document,
            Page: reactPdf.Page,
          });
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load PDF viewer:', err);
        if (mounted) {
          setError('Failed to load PDF viewer');
          setIsLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/50">
        <span className="text-sm text-muted-foreground">Loading PDF viewer...</span>
      </div>
    );
  }

  if (error || !ReactPDF) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-destructive/10">
        <span className="text-sm text-destructive">{error || 'PDF viewer unavailable'}</span>
      </div>
    );
  }

  const { Document, Page } = ReactPDF;

  return (
    <Document
      file={fileUrl}
      loading={
        <div className="w-full h-full flex items-center justify-center bg-muted/50">
          <span className="text-sm text-muted-foreground">Loading PDF...</span>
        </div>
      }
      error={
        <div className="w-full h-full flex items-center justify-center bg-destructive/10">
          <span className="text-sm text-destructive">Failed to load PDF</span>
        </div>
      }
    >
      <Page
        pageNumber={pageNumber}
        width={width}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        className="pointer-events-none"
      />
    </Document>
  );
}
