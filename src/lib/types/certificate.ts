// Certificate Field Types
export type FieldType = 'name' | 'course' | 'start_date' | 'end_date' | 'custom_text' | 'qr_code';

export type TextAlign = 'left' | 'center' | 'right';
export type FontWeight = 'normal' | 'bold';
export type FontStyle = 'normal' | 'italic';

// Individual field configuration
export interface CertificateField {
  id: string;
  type: FieldType;
  label: string;
  dataKey?: string; // Maps to Excel column (e.g., "Recipient Name")

  // Position & Size (in pixels, relative to PDF)
  x: number;
  y: number;
  width: number;
  height: number;

  // Styling
  fontSize: number; // Font size in pt
  fontFamily: string; // Google Fonts name
  color: string; // Hex color
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  textAlign: TextAlign;

  // Formatting options
  dateFormat?: string; // For date fields: "MM/DD/YYYY", "DD-MM-YYYY", etc
  prefix?: string; // Text before value (e.g., "Name: ")
  suffix?: string; // Text after value

  // Sample/default value for preview
  sampleValue?: string;
}

// Template configuration
export interface CertificateTemplate {
  id?: string;
  templateName: string;
  fileUrl: string; // URL to uploaded file (PDF or image)
  fileType: 'pdf' | 'image'; // File type
  pdfWidth: number; // Template dimensions in pixels
  pdfHeight: number;
  fields: CertificateField[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Imported data from Excel/CSV
export interface ImportedData {
  fileName: string;
  headers: string[]; // Column names
  rows: Record<string, any>[]; // Array of row objects
  rowCount: number;
}

// Column mapping (Excel column -> Certificate field)
export interface FieldMapping {
  fieldId: string; // Certificate field ID
  columnName: string; // Excel column name
}

// Export options
export interface ExportOptions {
  format: 'individual' | 'merged';
  includeQR: boolean;
  qrPosition?: { x: number; y: number; size: number };
  fileName: string;
  compression?: 'none' | 'low' | 'high';
}

// Generation job status
export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface GenerationJob {
  id: string;
  status: GenerationStatus;
  totalCertificates: number;
  processedCertificates: number;
  failedCertificates: number;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Google Fonts list (popular fonts for certificates)
export const CERTIFICATE_FONTS = [
  { name: 'Arial', value: 'Arial', category: 'sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman', category: 'serif' },
  { name: 'Courier New', value: 'Courier New', category: 'monospace' },
  { name: 'Georgia', value: 'Georgia', category: 'serif' },
  { name: 'Helvetica', value: 'Helvetica', category: 'sans-serif' },
  { name: 'Playfair Display', value: 'Playfair Display', category: 'serif', googleFont: true },
  { name: 'Roboto', value: 'Roboto', category: 'sans-serif', googleFont: true },
  { name: 'Open Sans', value: 'Open Sans', category: 'sans-serif', googleFont: true },
  { name: 'Lato', value: 'Lato', category: 'sans-serif', googleFont: true },
  { name: 'Montserrat', value: 'Montserrat', category: 'sans-serif', googleFont: true },
  { name: 'Merriweather', value: 'Merriweather', category: 'serif', googleFont: true },
  { name: 'Poppins', value: 'Poppins', category: 'sans-serif', googleFont: true },
  { name: 'Great Vibes', value: 'Great Vibes', category: 'handwriting', googleFont: true },
  { name: 'Dancing Script', value: 'Dancing Script', category: 'handwriting', googleFont: true },
] as const;

// Preset colors for quick selection
export const PRESET_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#4A5568' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Gold', value: '#D97706' },
  { name: 'Dark Green', value: '#047857' },
  { name: 'Burgundy', value: '#991B1B' },
  { name: 'Navy', value: '#1E3A8A' },
  { name: 'Brown', value: '#78350F' },
] as const;

// Date format options
export const DATE_FORMATS = [
  { label: 'MM/DD/YYYY', value: 'MM/dd/yyyy', example: '01/15/2026' },
  { label: 'DD/MM/YYYY', value: 'dd/MM/yyyy', example: '15/01/2026' },
  { label: 'YYYY-MM-DD', value: 'yyyy-MM-dd', example: '2026-01-15' },
  { label: 'Month DD, YYYY', value: 'MMMM dd, yyyy', example: 'January 15, 2026' },
  { label: 'DD Month YYYY', value: 'dd MMMM yyyy', example: '15 January 2026' },
  { label: 'Mon DD, YYYY', value: 'MMM dd, yyyy', example: 'Jan 15, 2026' },
] as const;

// Field type metadata
export const FIELD_TYPE_CONFIG = {
  name: {
    label: 'Recipient Name',
    icon: 'User',
    defaultWidth: 300,
    defaultHeight: 40,
    sampleValue: 'John Doe',
  },
  course: {
    label: 'Course Name',
    icon: 'BookOpen',
    defaultWidth: 350,
    defaultHeight: 40,
    sampleValue: 'Web Development Fundamentals',
  },
  start_date: {
    label: 'Start Date',
    icon: 'Calendar',
    defaultWidth: 150,
    defaultHeight: 30,
    sampleValue: 'January 15, 2026',
  },
  end_date: {
    label: 'End Date',
    icon: 'Calendar',
    defaultWidth: 150,
    defaultHeight: 30,
    sampleValue: 'March 15, 2026',
  },
  custom_text: {
    label: 'Custom Text',
    icon: 'Type',
    defaultWidth: 200,
    defaultHeight: 30,
    sampleValue: 'Custom Value',
  },
  qr_code: {
    label: 'QR Code',
    icon: 'QrCode',
    defaultWidth: 100,
    defaultHeight: 100,
    sampleValue: '[QR Code]',
  },
} as const;
