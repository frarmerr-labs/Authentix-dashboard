"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  MoreHorizontal,
  QrCode,
  Mail,
  Phone,
  Calendar,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { api, type Certificate } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface FilterState {
  search: string;
  status: string;
  category: string;
  subcategory: string;
  dateFrom: string;
  dateTo: string;
}

const initialFilters: FilterState = {
  search: "",
  status: "",
  category: "",
  subcategory: "",
  dateFrom: "",
  dateTo: "",
};

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [previewCertificate, setPreviewCertificate] = useState<Certificate | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.certificates.list({
        page,
        limit: 20,
        search: appliedFilters.search || undefined,
        status: appliedFilters.status as 'issued' | 'revoked' | 'expired' | undefined,
        category_id: appliedFilters.category || undefined,
        subcategory_id: appliedFilters.subcategory || undefined,
        date_from: appliedFilters.dateFrom || undefined,
        date_to: appliedFilters.dateTo || undefined,
        sort_by: "created_at",
        sort_order: "desc",
      });
      setCertificates(response.items || []);
      setTotalPages(response.pagination?.total_pages || 1);
      setTotalItems(response.pagination?.total || 0);
    } catch (err) {
      console.error("Error loading certificates:", err);
      // Set empty state on error
      setCertificates([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await api.catalog.getCategories();
      // Extract flat categories
      const flatCategories = response.groups?.flatMap(g => g.items) || response.flat || [];
      setCategories(flatCategories.map(c => ({ id: c.id, name: c.name })));
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    try {
      const response = await api.catalog.getSubcategories(categoryId);
      setSubcategories(response.items?.map(s => ({ id: s.id, name: s.name })) || []);
    } catch (err) {
      console.error("Error loading subcategories:", err);
      setSubcategories([]);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters(prev => ({ ...prev, search: filters.search }));
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({ ...prev, category: value, subcategory: "" }));
    if (value) {
      loadSubcategories(value);
    } else {
      setSubcategories([]);
    }
  };

  const handleDownload = async (certificate: Certificate) => {
    try {
      const result = await api.certificates.getDownloadUrl(certificate.id);
      window.open(result.url, "_blank");
    } catch (err) {
      console.error("Error downloading certificate:", err);
      alert("Failed to download certificate");
    }
  };

  const getStatusBadge = (status: Certificate["status"]) => {
    const variants: Record<Certificate["status"], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      issued: { variant: "default", label: "Issued" },
      revoked: { variant: "destructive", label: "Revoked" },
      expired: { variant: "secondary", label: "Expired" },
    };
    const config = variants[status] || variants.issued;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificates</h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            View and manage all issued certificates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCertificates} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 border border-border bg-card/60">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, email, phone, or certificate number..."
              className="pl-10 h-10"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </form>
          <div className="flex gap-2">
            <Button
              variant={hasActiveFilters ? "default" : "outline"}
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {Object.values(appliedFilters).filter(v => v !== "").length}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={handleClearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={filters.category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subcategory</label>
              <Select
                value={filters.subcategory}
                onValueChange={(value) => setFilters(prev => ({ ...prev, subcategory: value }))}
                disabled={!filters.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All subcategories</SelectItem>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Issue Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Issue Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end items-end">
              <Button onClick={handleApplyFilters}>Apply Filters</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Results Summary */}
      {!loading && (
        <div className="text-sm text-muted-foreground">
          Showing {certificates.length} of {totalItems} certificates
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : certificates.length === 0 ? (
        <Card className="border-2 border-dashed border-border bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-6">
              <FileCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No certificates found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
              {hasActiveFilters
                ? "No certificates match your current filters. Try adjusting your search criteria."
                : "Certificates will appear here after you generate them using the certificate generator."}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button asChild>
                <a href="/dashboard/generate-certificate">Generate Certificates</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recipient</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Certificate #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issue Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{cert.recipient_name}</p>
                        {cert.course_name && (
                          <p className="text-xs text-muted-foreground">{cert.course_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {cert.recipient_email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {cert.recipient_email}
                          </span>
                        )}
                        {cert.recipient_phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {cert.recipient_phone}
                          </span>
                        )}
                        {!cert.recipient_email && !cert.recipient_phone && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {cert.certificate_number}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {cert.template?.category?.name && (
                          <Badge variant="outline" className="text-xs w-fit">
                            {cert.template.category.name}
                          </Badge>
                        )}
                        {cert.template?.subcategory?.name && (
                          <span className="text-xs text-muted-foreground">
                            {cert.template.subcategory.name}
                          </span>
                        )}
                        {!cert.template?.category?.name && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{format(new Date(cert.issue_date), "MMM d, yyyy")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cert.expiry_date ? (
                        <span className={cn(
                          "text-sm",
                          new Date(cert.expiry_date) < new Date() && "text-destructive"
                        )}>
                          {format(new Date(cert.expiry_date), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(cert.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewCertificate(cert)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(cert)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          {cert.verification_token && (
                            <DropdownMenuItem
                              onClick={() => window.open(`/verify/${cert.verification_token}`, "_blank")}
                            >
                              <QrCode className="h-4 w-4 mr-2" />
                              Verify Link
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => window.open(`/verify/${cert.verification_code}`, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Public Page
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Certificate Preview Dialog */}
      <Dialog open={!!previewCertificate} onOpenChange={() => setPreviewCertificate(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          {previewCertificate && (
            <div className="space-y-4">
              {/* Preview Image */}
              {previewCertificate.preview_url ? (
                <div className="border rounded-lg overflow-hidden bg-muted">
                  <img
                    src={previewCertificate.preview_url}
                    alt="Certificate preview"
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div className="border rounded-lg p-8 bg-muted text-center">
                  <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Preview not available</p>
                </div>
              )}

              {/* Certificate Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Recipient</p>
                  <p className="font-medium">{previewCertificate.recipient_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Certificate Number</p>
                  <p className="font-medium font-mono">{previewCertificate.certificate_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Issue Date</p>
                  <p className="font-medium">
                    {format(new Date(previewCertificate.issue_date), "MMMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expiry Date</p>
                  <p className="font-medium">
                    {previewCertificate.expiry_date
                      ? format(new Date(previewCertificate.expiry_date), "MMMM d, yyyy")
                      : "Never"}
                  </p>
                </div>
                {previewCertificate.recipient_email && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{previewCertificate.recipient_email}</p>
                  </div>
                )}
                {previewCertificate.recipient_phone && (
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{previewCertificate.recipient_phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(previewCertificate.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">Verification Code</p>
                  <p className="font-medium font-mono">{previewCertificate.verification_code}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => handleDownload(previewCertificate)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/verify/${previewCertificate.verification_code}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Public Page
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
