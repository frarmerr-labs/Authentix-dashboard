'use client';

import { CertificateField, FieldType, FIELD_TYPE_CONFIG } from '@/lib/types/certificate';
import { Button } from '@/components/ui/button';
import { User, BookOpen, Calendar, Type, QrCode } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface FieldTypeSelectorProps {
  onAddField: (field: CertificateField) => void;
  pdfWidth: number;
  pdfHeight: number;
}

const FIELD_ICONS = {
  name: User,
  course: BookOpen,
  start_date: Calendar,
  end_date: Calendar,
  custom_text: Type,
  qr_code: QrCode,
};

export function FieldTypeSelector({ onAddField, pdfWidth, pdfHeight }: FieldTypeSelectorProps) {
  const createField = (type: FieldType) => {
    const config = FIELD_TYPE_CONFIG[type];

    // Center the field in the PDF
    const x = (pdfWidth - config.defaultWidth) / 2;
    const y = (pdfHeight - config.defaultHeight) / 2;

    const field: CertificateField = {
      id: uuidv4(),
      type,
      label: config.label,
      x,
      y,
      width: config.defaultWidth,
      height: config.defaultHeight,
      fontSize: type === 'qr_code' ? 0 : 24,
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center',
      sampleValue: config.sampleValue,
    };

    // Set date format for date fields
    if (type === 'start_date' || type === 'end_date') {
      field.dateFormat = 'MMMM dd, yyyy';
    }

    onAddField(field);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(FIELD_TYPE_CONFIG) as FieldType[]).map((type) => {
        const Icon = FIELD_ICONS[type];
        const config = FIELD_TYPE_CONFIG[type];

        return (
          <Button
            key={type}
            variant="outline"
            className="h-auto flex-col gap-2 py-3"
            onClick={() => createField(type)}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{config.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
