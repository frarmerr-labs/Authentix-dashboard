'use client';

import { useEffect, useState } from 'react';

interface PDFViewerProps {
  fileUrl: string;
  width: number;
}

export function PDFViewer({ fileUrl, width }: PDFViewerProps) {
  const [Document, setDocument] = useState<any>(null);
  const [Page, setPage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only load react-pdf on the client after mount
    let mounted = true;

    const loadPDF = async () => {
      try {
        const reactPdf = await import('react-pdf');

        // Configure worker
        reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${reactPdf.pdfjs.version}/build/pdf.worker.min.js`;

        if (mounted) {
          setDocument(() => reactPdf.Document);
          setPage(() => reactPdf.Page);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load PDF viewer:', error);
        setIsLoading(false);
      }
    };

    loadPDF();

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading || !Document || !Page) {
    return <div className="p-8 bg-muted rounded">Loading PDF viewer...</div>;
  }

  return (
    <Document file={fileUrl} loading={<div className="p-8">Loading PDF...</div>}>
      <Page
        pageNumber={1}
        width={width}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
    </Document>
  );
}
