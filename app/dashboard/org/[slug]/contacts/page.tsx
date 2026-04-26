"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, Upload, Search, Trash2, Loader2, AlertCircle,
  Download, MailX, MailCheck, FileSpreadsheet, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useEmailContacts, useImportContacts, useDeleteContact, useUpdateContact } from "@/lib/hooks/queries/delivery";
import type { EmailContact } from "@/lib/api/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterUnsubscribed, setFilterUnsubscribed] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<EmailContact | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { contacts, total, loading } = useEmailContacts({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search: debouncedSearch || undefined,
    unsubscribed: filterUnsubscribed,
  });

  const importMutation = useImportContacts();
  const deleteMutation = useDeleteContact();
  const updateMutation = useUpdateContact();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 350);
  };

  const handleFileSelect = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      toast.error("Only Excel (.xlsx, .xls) or CSV files are supported");
      return;
    }
    try {
      const result = await importMutation.mutateAsync(file);
      setImportResult(result);
      toast.success(`Imported ${result.imported} contacts`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }, [importMutation]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your email subscriber list
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Upload className="h-4 w-4 mr-2" />}
            Import Excel / CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }}
          />
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <span className="font-medium">{importResult.imported} contacts imported</span>
            {importResult.skipped > 0 && `, ${importResult.skipped} skipped (duplicates)`}
            {importResult.errors.length > 0 && (
              <p className="mt-1 text-xs text-red-600">{importResult.errors.slice(0, 3).join(", ")}</p>
            )}
            <Button variant="ghost" size="sm" className="ml-2 h-5 text-xs" onClick={() => setImportResult(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Drop zone when empty */}
      {!loading && contacts.length === 0 && !debouncedSearch && filterUnsubscribed === undefined && (
        <div
          className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30"
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Drop your Excel or CSV file here</p>
          <p className="text-sm text-muted-foreground mt-1">
            Required column: <code className="text-xs bg-muted px-1 rounded">email</code>
            &nbsp;— Optional: <code className="text-xs bg-muted px-1 rounded">first_name</code>,{" "}
            <code className="text-xs bg-muted px-1 rounded">last_name</code>, and any custom columns
          </p>
        </div>
      )}

      {/* Filters */}
      {(contacts.length > 0 || debouncedSearch || filterUnsubscribed !== undefined) && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name…"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={filterUnsubscribed === undefined ? "outline" : "secondary"}
            size="sm"
            onClick={() => { setFilterUnsubscribed(undefined); setPage(0); }}
          >
            All
          </Button>
          <Button
            variant={filterUnsubscribed === false ? "secondary" : "outline"}
            size="sm"
            onClick={() => { setFilterUnsubscribed(false); setPage(0); }}
          >
            <MailCheck className="h-3.5 w-3.5 mr-1.5" /> Subscribed
          </Button>
          <Button
            variant={filterUnsubscribed === true ? "secondary" : "outline"}
            size="sm"
            onClick={() => { setFilterUnsubscribed(true); setPage(0); }}
          >
            <MailX className="h-3.5 w-3.5 mr-1.5" /> Unsubscribed
          </Button>
          <span className="text-sm text-muted-foreground ml-auto">
            {total.toLocaleString()} contacts
          </span>
        </div>
      )}

      {/* Table */}
      {contacts.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Added</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(contact => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      onDelete={() => setDeleteTarget(contact)}
                      onToggleSubscription={() =>
                        updateMutation.mutate(
                          { id: contact.id, dto: { unsubscribed: !contact.unsubscribed } },
                          { onSuccess: () => toast.success(contact.unsubscribed ? "Resubscribed" : "Unsubscribed") },
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium">{deleteTarget?.email}</span> from your contact list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id, {
                  onSuccess: () => { toast.success("Contact deleted"); setDeleteTarget(null); },
                  onError: () => toast.error("Failed to delete contact"),
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ContactRow({
  contact,
  onDelete,
  onToggleSubscription,
}: {
  contact: EmailContact;
  onDelete: () => void;
  onToggleSubscription: () => void;
}) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—";

  return (
    <tr className="border-b last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 font-mono text-xs">{contact.email}</td>
      <td className="px-4 py-3 text-muted-foreground">{name}</td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            contact.unsubscribed
              ? "border-red-200 text-red-600 bg-red-50 dark:bg-red-950/20"
              : "border-green-200 text-green-700 bg-green-50 dark:bg-green-950/20",
          )}
        >
          {contact.unsubscribed ? "Unsubscribed" : "Subscribed"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs">
        {format(new Date(contact.created_at), "dd MMM yyyy")}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onToggleSubscription}
          >
            {contact.unsubscribed ? <MailCheck className="h-3.5 w-3.5" /> : <MailX className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
