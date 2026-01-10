'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Upload, FileCheck } from 'lucide-react';

interface TemplateUploaderProps {
  onUpload: (file: File, width: number, height: number) => void;
}

export function TemplateUploader({ onUpload }: TemplateUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsProcessing(true);

      try {
        const fileType = file.type;

        if (fileType === 'application/pdf') {
          // Handle PDF files
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1 });

          onUpload(file, viewport.width, viewport.height);
        } else if (fileType.startsWith('image/')) {
          // Handle image files (JPEG, PNG)
          const img = new Image();
          const imageUrl = URL.createObjectURL(file);

          img.onload = () => {
            onUpload(file, img.naturalWidth, img.naturalHeight);
            URL.revokeObjectURL(imageUrl);
          };

          img.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            throw new Error('Failed to load image');
          };

          img.src = imageUrl;
        } else {
          throw new Error('Unsupported file type');
        }
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Failed to process file. Please ensure it is a valid PDF, JPEG, or PNG file.');
      } finally {
        if (file.type === 'application/pdf') {
          setIsProcessing(false);
        } else {
          // For images, processing ends in onload callback
          setTimeout(() => setIsProcessing(false), 100);
        }
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-3">
        {isProcessing ? (
          <>
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Processing PDF...</p>
          </>
        ) : isDragActive ? (
          <>
            <FileCheck className="w-12 h-12 text-primary" />
            <p className="text-sm font-medium">Drop your PDF here</p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Upload Certificate Template</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPEG, or PNG • Drag & drop or click
              </p>
            </div>
            <Button type="button" variant="outline" size="sm">
              Choose File
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
