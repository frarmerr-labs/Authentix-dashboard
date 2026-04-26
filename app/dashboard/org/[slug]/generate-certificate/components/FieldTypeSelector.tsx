'use client';

import { useState, useRef } from 'react';
import { CertificateField, FieldType, FIELD_TYPE_CONFIG } from '@/lib/types/certificate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { User, BookOpen, Calendar, Type, QrCode, Image as ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface FieldTypeSelectorProps {
  onAddField: (field: CertificateField) => void;
  onAddImageField?: (url: string, name: string) => void;
  /** Preferred over onAddImageField — parent handles upload + blob-swap */
  onAddImageFile?: (file: File) => void;
  pdfWidth: number;
  pdfHeight: number;
  currentPage?: number; // For multi-page PDF support
}

const FIELD_ICONS = {
  name: User,
  course: BookOpen,
  start_date: Calendar,
  end_date: Calendar,
  custom_text: Type,
  qr_code: QrCode,
  image: ImageIcon,
};

// Reference dimensions the FIELD_TYPE_CONFIG defaults were designed for (A4 portrait at 72 DPI)
const REF_WIDTH = 595;
const REF_HEIGHT = 842;

export function FieldTypeSelector({ onAddField, onAddImageField, onAddImageFile, pdfWidth, pdfHeight, currentPage = 0 }: FieldTypeSelectorProps) {
  const [showCustomNameDialog, setShowCustomNameDialog] = useState(false);
  const [customFieldName, setCustomFieldName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createField = (type: FieldType, customLabel?: string) => {
    const config = FIELD_TYPE_CONFIG[type];

    // Scale field dimensions proportionally to the actual template size so fields
    // look visually similar regardless of orientation (portrait vs landscape).
    const wScale = pdfWidth > 0 ? pdfWidth / REF_WIDTH : 1;
    const hScale = pdfHeight > 0 ? pdfHeight / REF_HEIGHT : 1;

    const scaledWidth = Math.round(config.defaultWidth * wScale);
    const scaledHeight = Math.round(config.defaultHeight * hScale);

    // Center the field in the PDF
    const x = (pdfWidth - scaledWidth) / 2;
    const y = (pdfHeight - scaledHeight) / 2;

    const label = customLabel || config.label;

    const field: CertificateField = {
      id: uuidv4(),
      type,
      label,
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
      pageNumber: currentPage, // Assign to current page
      // Font size scales with template height; clamped to a readable minimum
      fontSize: type === 'qr_code' ? 0 : Math.max(12, Math.round(24 * hScale)),
      fontFamily: 'DM Sans',
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      sampleValue: customLabel || config.sampleValue,
    };

    // Set date format for date fields
    if (type === 'start_date' || type === 'end_date') {
      field.dateFormat = 'MMMM dd, yyyy';
    }

    onAddField(field);
  };

  const handleFieldClick = (type: FieldType) => {
    if (type === 'custom_text') {
      setCustomFieldName('');
      setShowCustomNameDialog(true);
    } else if (type === 'image' && (onAddImageFile || onAddImageField)) {
      fileInputRef.current?.click();
    } else {
      createField(type);
    }
  };

  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onAddImageFile) {
      // Parent handles upload + blob-swap (permanent URL persistence)
      onAddImageFile(file);
    } else {
      // Fallback: blob URL only (no server upload)
      const url = URL.createObjectURL(file);
      onAddImageField?.(url, file.name);
    }
    // Reset input so same file can be re-picked
    e.target.value = '';
  };

  const handleCreateCustomField = () => {
    const name = customFieldName.trim() || 'Custom Text';
    createField('custom_text', name);
    setShowCustomNameDialog(false);
    setCustomFieldName('');
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelected}
      />
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).map((type) => {
          const Icon = FIELD_ICONS[type];
          const config = FIELD_TYPE_CONFIG[type];

          return (
            <Button
              key={type}
              variant="outline"
              className="h-auto flex-col gap-2 py-3"
              onClick={() => handleFieldClick(type)}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{config.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Custom Field Name Dialog */}
      <Dialog open={showCustomNameDialog} onOpenChange={setShowCustomNameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fieldName">Field Name</Label>
              <Input
                id="fieldName"
                value={customFieldName}
                onChange={(e) => setCustomFieldName(e.target.value)}
                placeholder="e.g., Address, Company Name, ID Number"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCustomField();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                This name will appear in the sample file and field mapping
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomNameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomField}>
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
