"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Download, Info, Mail, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { useCertificateCategories } from "@/lib/hooks/use-certificate-categories";

export default function ImportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [importedData, setImportedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Use the shared hook for DB-driven category logic
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    getSubcategories,
    requiresSubcategory,
  } = useCertificateCategories();

  // Get subcategories for selected category
  const subcategories = categoryName ? getSubcategories(categoryName) : [];
  const showSubcategory = categoryName && requiresSubcategory(categoryName);

  // Reset subcategory when category changes
  useEffect(() => {
    if (!showSubcategory) {
      setSubcategoryName("");
    }
  }, [showSubcategory]);

  useEffect(() => {
    loadTemplates();
  }, []);

  // Set error from categories hook
  useEffect(() => {
    if (categoriesError) {
      setError(categoriesError);
    }
  }, [categoriesError]);

  const loadTemplates = async () => {
    try {
      const response = await api.templates.list({ status: 'active', sort_by: 'name', sort_order: 'asc' });
      setTemplates(response.items.map((t: any) => ({ id: t.id, name: t.name })) || []);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const generateSampleFile = () => {
    const sampleData = [
      {
        recipient_name: "John Doe",
        recipient_email: "john@example.com",
        recipient_phone: "+1234567890",
        custom_field_1: "Sample Value 1",
        custom_field_2: "Sample Value 2",
      },
      {
        recipient_name: "Jane Smith",
        recipient_email: "jane@example.com",
        recipient_phone: "+9876543210",
        custom_field_1: "Sample Value 3",
        custom_field_2: "Sample Value 4",
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recipients");
    XLSX.writeFile(wb, "certificate_recipients_sample.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelected(selectedFile);
    }
  };

  const handleFileSelected = async (selectedFile: File) => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Please upload a valid CSV or Excel file");
      return;
    }

    setFile(selectedFile);
    setError("");
    await parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setError("File contains no sheets");
        return;
      }
      
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        setError("Failed to read worksheet");
        return;
      }
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        setError("File is empty");
        return;
      }

      const fileHeaders = Object.keys(jsonData[0] as object);
      setHeaders(fileHeaders);

      const emailCol = fileHeaders.find(h => h.toLowerCase().includes('email'));
      const phoneCol = fileHeaders.find(h => h.toLowerCase().includes('phone') || h.toLowerCase().includes('whatsapp'));

      const hasEmailData = emailCol && jsonData.some((row: any) => row[emailCol]);
      const hasPhoneData = phoneCol && jsonData.some((row: any) => row[phoneCol]);

      setHasEmail(!!hasEmailData);
      setHasPhone(!!hasPhoneData);
      setImportedData(jsonData);
    } catch (err) {
      console.error('Error parsing file:', err);
      setError("Failed to parse file");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelected(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !categoryName) {
      setError("Please select a file and category");
      return;
    }

    // Validate subcategory if required
    if (requiresSubcategory(categoryName) && !subcategoryName) {
      setError("Please select a subcategory");
      return;
    }

    setUploading(true);
    setError("");

    try {
      await api.imports.create(file, {
        file_name: file.name,
        certificate_category: categoryName,
        certificate_subcategory: subcategoryName || undefined,
        certificate_template_id: templateId || undefined,
        reusable: false,
      });

      setFile(null);
      setImportedData([]);
      setHeaders([]);
      setCategoryName("");
      setSubcategoryName("");
      setTemplateId("");
      setError("");
      alert("Import successful! Data is being processed.");
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || "Failed to upload import");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Imports</h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            Import CSV / Excel files to generate certificates in bulk
          </p>
        </div>
        <Button variant="outline" onClick={generateSampleFile} className="gap-2">
          <Download className="h-4 w-4" />
          Download Sample File
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Required columns:</strong> recipient_name<br />
          <strong>Optional columns:</strong> recipient_email, recipient_phone/whatsapp_number, custom fields
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload Recipients Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              file && "border-primary bg-primary/5"
            )}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />

            {file ? (
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-muted text-muted-foreground">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {importedData.length} rows • {headers.length} columns
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setImportedData([]);
                    setHeaders([]);
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-muted text-muted-foreground">
                  <Upload className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-medium">Drop your CSV / Excel file here</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports: CSV, XLSX, XLS
                </p>
              </div>
            )}
          </div>

          {file && importedData.length > 0 && (
            <>
              <div className="flex gap-2">
                <Badge variant={hasEmail ? "default" : "secondary"} className="gap-1">
                  {hasEmail ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  <Mail className="h-3 w-3" />
                  Email {hasEmail ? "Available" : "Not Available"}
                </Badge>
                <Badge variant={hasPhone ? "default" : "secondary"} className="gap-1">
                  {hasPhone ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  <MessageSquare className="h-3 w-3" />
                  WhatsApp {hasPhone ? "Available" : "Not Available"}
                </Badge>
              </div>

              <div className="space-y-4">
                {categoriesError && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      {categoriesError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={categoryName} 
                    onValueChange={setCategoryName} 
                    disabled={uploading || categoriesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcategory - Only shown if category requires it */}
                {showSubcategory && (
                  <div className="space-y-2">
                    <Label>
                      Subcategory <span className="text-destructive">*</span>
                    </Label>
                    <Select value={subcategoryName} onValueChange={setSubcategoryName} disabled={uploading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.map((subcat) => (
                          <SelectItem key={subcat} value={subcat}>
                            {subcat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Certificate Template (Optional)</Label>
                  <Select value={templateId} onValueChange={setTemplateId} disabled={uploading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((tmpl) => (
                        <SelectItem key={tmpl.id} value={tmpl.id}>
                          {tmpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {headers.map((header, i) => (
                          <th key={i} className="px-4 py-2 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importedData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-t">
                          {headers.map((header, j) => (
                            <td key={j} className="px-4 py-2">
                              {row[header] || <span className="text-muted-foreground">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importedData.length > 10 && (
                  <div className="px-4 py-2 bg-muted text-xs text-muted-foreground border-t">
                    Showing first 10 of {importedData.length} rows
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button 
                onClick={handleUpload} 
                disabled={
                  uploading || 
                  !categoryName || 
                  (showSubcategory && !subcategoryName) ||
                  categoriesLoading
                } 
                className="w-full gap-2"
              >
                {uploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import {importedData.length} Recipients
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
