'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { CertificateField, ImportedData } from '@/lib/types/certificate';
import { cn } from '@/lib/utils';

interface ManualDataEntryProps {
  fields: CertificateField[];
  onDataSubmit: (data: ImportedData) => void;
  className?: string;
}

interface RecipientRow {
  id: string;
  data: Record<string, string>;
  isEditing: boolean;
}

// Default columns that should always be present
const DEFAULT_COLUMNS = [
  { key: 'recipient_name', label: 'Recipient Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Phone/WhatsApp', required: false },
];

export function ManualDataEntry({ fields, onDataSubmit, className }: ManualDataEntryProps) {
  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [editingRow, setEditingRow] = useState<RecipientRow | null>(null);

  // Build columns from default + template fields
  const getColumns = () => {
    const columns = [...DEFAULT_COLUMNS];

    // Add template fields (excluding QR code)
    fields
      .filter((f) => f.type !== 'qr_code')
      .forEach((field) => {
        // Skip if already in default columns
        const fieldKey = field.label.toLowerCase().replace(/\s+/g, '_');
        if (!columns.find((c) => c.key === fieldKey)) {
          columns.push({
            key: fieldKey,
            label: field.label,
            required: false,
          });
        }
      });

    return columns;
  };

  const columns = getColumns();

  // Create empty row data
  const createEmptyRowData = (): Record<string, string> => {
    const data: Record<string, string> = {};
    columns.forEach((col) => {
      data[col.key] = '';
    });
    return data;
  };

  // Add new row
  const handleAddRow = () => {
    const newRow: RecipientRow = {
      id: crypto.randomUUID(),
      data: createEmptyRowData(),
      isEditing: true,
    };
    setRows([...rows, newRow]);
    setEditingRow(newRow);
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
    if (editingRow?.id === id) {
      setEditingRow(null);
    }
  };

  // Start editing
  const handleStartEdit = (row: RecipientRow) => {
    setEditingRow({ ...row });
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingRow) return;

    setRows(
      rows.map((r) =>
        r.id === editingRow.id ? { ...editingRow, isEditing: false } : r
      )
    );
    setEditingRow(null);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    // If it's a new unsaved row, remove it
    if (editingRow && !rows.find((r) => r.id === editingRow.id && !r.isEditing)) {
      setRows(rows.filter((r) => r.id !== editingRow.id || !r.isEditing));
    }
    setEditingRow(null);
  };

  // Update field in editing row
  const handleFieldChange = (key: string, value: string) => {
    if (!editingRow) return;
    setEditingRow({
      ...editingRow,
      data: { ...editingRow.data, [key]: value },
    });
  };

  // Validate row
  const isRowValid = (row: RecipientRow): boolean => {
    return columns
      .filter((c) => c.required)
      .every((c) => row.data[c.key]?.trim());
  };

  // Check if all rows are valid
  const allRowsValid = rows.length > 0 && rows.every(isRowValid);

  // Submit data
  const handleSubmit = () => {
    if (!allRowsValid) return;

    // Convert rows to ImportedData format
    const headers = columns.map((c) => c.label);
    const dataRows = rows.map((row) => {
      const rowData: Record<string, unknown> = {};
      columns.forEach((col) => {
        rowData[col.label] = row.data[col.key] || '';
      });
      return rowData;
    });

    const importedData: ImportedData = {
      fileName: 'Manual Entry',
      headers,
      rows: dataRows,
      rowCount: dataRows.length,
    };

    onDataSubmit(importedData);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Manual Data Entry</h3>
              <p className="text-sm text-muted-foreground">
                Add recipients one by one instead of uploading a file
              </p>
            </div>
          </div>
          <Badge variant="secondary">
            {rows.length} recipient{rows.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </Card>

      {/* Data Table */}
      {rows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="w-12 px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col.label}
                      {col.required && <span className="text-destructive ml-1">*</span>}
                    </th>
                  ))}
                  <th className="w-24 px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isEditing = editingRow?.id === row.id;
                  const currentData = isEditing ? editingRow.data : row.data;
                  const valid = isRowValid(isEditing ? editingRow : row);

                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b hover:bg-muted/30',
                        !valid && !isEditing && 'bg-yellow-50/50 dark:bg-yellow-950/20'
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {idx + 1}
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3">
                          {isEditing ? (
                            <Input
                              value={currentData[col.key] || ''}
                              onChange={(e) => handleFieldChange(col.key, e.target.value)}
                              placeholder={col.label}
                              className={cn(
                                'h-8 text-sm',
                                col.required && !currentData[col.key]?.trim() && 'border-destructive'
                              )}
                            />
                          ) : (
                            <span
                              className={cn(
                                'text-sm',
                                !currentData[col.key] && 'text-muted-foreground italic'
                              )}
                            >
                              {currentData[col.key] || '(empty)'}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-600"
                                onClick={handleSaveEdit}
                              >
                                <Save className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleStartEdit(row)}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteRow(row.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Row Button */}
      <Button variant="outline" onClick={handleAddRow} className="w-full gap-2" disabled={!!editingRow}>
        <Plus className="w-4 h-4" />
        Add Recipient
      </Button>

      {/* Validation Message */}
      {rows.length > 0 && !allRowsValid && (
        <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Some rows are missing required fields (Recipient Name, Email)</span>
        </div>
      )}

      {/* Submit Button */}
      {rows.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!allRowsValid || !!editingRow}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Use This Data ({rows.length} recipient{rows.length !== 1 ? 's' : ''})
          </Button>
        </div>
      )}

      {/* Empty State */}
      {rows.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <UserPlus className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No Recipients Added</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click &quot;Add Recipient&quot; to start entering data manually
          </p>
          <Button onClick={handleAddRow} className="gap-2">
            <Plus className="w-4 h-4" />
            Add First Recipient
          </Button>
        </Card>
      )}
    </div>
  );
}
