'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Download,
  Eye,
  FileArchive,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GeneratedCertificate {
  id: string;
  certificate_number: string;
  recipient_name: string;
  recipient_email: string | null;
  issued_at: string;
  expires_at: string | null;
  download_url: string | null;
  preview_url: string | null;
}

interface CertificateTableProps {
  certificates: GeneratedCertificate[];
  zipDownloadUrl?: string | null;
  totalCount: number;
  isLoading?: boolean;
  className?: string;
}

const PAGE_SIZE = 10;

export function CertificateTable({
  certificates,
  zipDownloadUrl,
  totalCount,
  isLoading,
  className,
}: CertificateTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const totalPages = Math.ceil(certificates.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedCertificates = certificates.slice(startIndex, endIndex);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDownload = async (cert: GeneratedCertificate) => {
    if (!cert.download_url) return;

    setDownloadingId(cert.id);
    try {
      const response = await fetch(cert.download_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cert.certificate_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = (cert: GeneratedCertificate) => {
    if (!cert.preview_url) return;
    setPreviewingId(cert.id);
    window.open(cert.preview_url, '_blank');
    setTimeout(() => setPreviewingId(null), 500);
  };

  const handleDownloadAll = () => {
    if (!zipDownloadUrl) return;
    window.open(zipDownloadUrl, '_blank');
  };

  if (isLoading) {
    return (
      <Card className={cn("p-8", className)}>
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Generating certificates...</p>
        </div>
      </Card>
    );
  }

  if (certificates.length === 0) {
    return null;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="font-semibold text-sm">Generated Certificates</h3>
            <p className="text-xs text-muted-foreground">
              {totalCount} certificate{totalCount !== 1 ? 's' : ''} created successfully
            </p>
          </div>
        </div>

        {zipDownloadUrl && totalCount > 1 && (
          <Button onClick={handleDownloadAll} variant="outline" size="sm" className="gap-2">
            <FileArchive className="w-4 h-4" />
            Download All (ZIP)
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="w-12 px-4 py-3 text-left font-medium text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recipient</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Certificate #</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issue Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCertificates.map((cert, index) => (
              <tr key={cert.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-muted-foreground">
                  {startIndex + index + 1}
                </td>
                <td className="px-4 py-3 font-medium">{cert.recipient_name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {cert.recipient_email || '-'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="font-mono text-xs">
                    {cert.certificate_number}
                  </Badge>
                </td>
                <td className="px-4 py-3">{formatDate(cert.issued_at)}</td>
                <td className="px-4 py-3">
                  {cert.expires_at ? (
                    <span>{formatDate(cert.expires_at)}</span>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Never
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {cert.preview_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePreview(cert)}
                        disabled={previewingId === cert.id}
                        title="Preview certificate"
                      >
                        {previewingId === cert.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    {cert.download_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(cert)}
                        disabled={downloadingId === cert.id}
                        title="Download certificate"
                      >
                        {downloadingId === cert.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, certificates.length)} of{' '}
            {certificates.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
