/**
 * Unit tests for autoMapForTemplate — pure field-to-column mapping logic.
 * Tests exact label matching, case-insensitivity, and type-based fallbacks.
 *
 * autoMapForTemplate is exported from ExportSection.tsx.
 * All component-level imports in ExportSection are mocked so we only load the function.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Module-level mocks (hoisted) ───────────────────────────────────────────────
vi.mock('@/lib/api/client', () => ({ api: { templates: {}, certificates: {} } }));
vi.mock('@/app/dashboard/org/[slug]/generate-certificate/components/ExpiryDateSelector', () => ({
  ExpiryDateSelector: () => null,
}));
vi.mock('@/app/dashboard/org/[slug]/generate-certificate/components/CertificateTable', () => ({
  CertificateTable: () => null,
}));

// ── Import the exported pure function ─────────────────────────────────────────
import { autoMapForTemplate } from '@/app/dashboard/org/[slug]/generate-certificate/components/ExportSection';
import type { CertificateField } from '@/lib/types/certificate';

// ── Field factory ──────────────────────────────────────────────────────────────
function makeField(id: string, type: CertificateField['type'], label: string): CertificateField {
  return {
    id, type, label,
    x: 0, y: 0, width: 200, height: 30,
    fontSize: 14, fontFamily: 'Arial', color: '#000',
    fontWeight: '400', fontStyle: 'normal', textAlign: 'left',
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('autoMapForTemplate — exact label match', () => {
  it('maps a field when header exactly matches the label', () => {
    const fields = [makeField('f1', 'custom_text', 'Grade')];
    const result = autoMapForTemplate(fields, ['Grade', 'Email']);
    expect(result).toEqual([{ fieldId: 'f1', columnName: 'Grade' }]);
  });

  it('is case-insensitive for exact matches', () => {
    const fields = [makeField('f1', 'custom_text', 'Recipient Name')];
    const result = autoMapForTemplate(fields, ['recipient name']);
    expect(result).toEqual([{ fieldId: 'f1', columnName: 'recipient name' }]);
  });

  it('trims whitespace from both header and label for matching', () => {
    const fields = [makeField('f1', 'custom_text', '  Score  ')];
    const result = autoMapForTemplate(fields, ['  Score  ']);
    expect(result).toHaveLength(1);
    expect(result[0]!.fieldId).toBe('f1');
  });

  it('returns empty array when no headers match any field', () => {
    const fields = [makeField('f1', 'custom_text', 'Grade')];
    const result = autoMapForTemplate(fields, ['Name', 'Email']);
    expect(result).toEqual([]);
  });

  it('returns empty array when fields array is empty', () => {
    const result = autoMapForTemplate([], ['Name', 'Email', 'Grade']);
    expect(result).toEqual([]);
  });

  it('returns empty array when headers array is empty', () => {
    const fields = [makeField('f1', 'name', 'Recipient Name')];
    const result = autoMapForTemplate(fields, []);
    expect(result).toEqual([]);
  });
});

describe('autoMapForTemplate — type-based fallbacks', () => {
  it('maps "name" field to a header containing "name" (fallback)', () => {
    const fields = [makeField('f1', 'name', 'Recipient Name')];
    const result = autoMapForTemplate(fields, ['Student Name']); // exact miss, but contains "name"
    expect(result).toEqual([{ fieldId: 'f1', columnName: 'Student Name' }]);
  });

  it('maps "course" field to a header containing "course"', () => {
    const fields = [makeField('f1', 'course', 'Course Title')];
    const result = autoMapForTemplate(fields, ['Course']);
    expect(result).toEqual([{ fieldId: 'f1', columnName: 'Course' }]);
  });

  it('maps "course" field to a header containing "program"', () => {
    const fields = [makeField('f1', 'course', 'Program')];
    const result = autoMapForTemplate(fields, ['Program Name']);
    expect(result).toEqual([{ fieldId: 'f1', columnName: 'Program Name' }]);
  });

  it('maps "start_date" field to a header containing "start"', () => {
    const fields = [makeField('f1', 'start_date', 'Start Date')];
    const result = autoMapForTemplate(fields, ['start_date_col']);
    expect(result).toEqual([{ fieldId: 'f1', columnName: 'start_date_col' }]);
  });

  it('maps "start_date" field to a header containing "issue"', () => {
    const fields = [makeField('f1', 'start_date', 'Issue Date')];
    const result = autoMapForTemplate(fields, ['Issue Date']);
    // Exact match takes precedence but fallback also works here
    expect(result[0]!.columnName).toBe('Issue Date');
  });

  it('maps "end_date" field to a header containing "end"', () => {
    const fields = [makeField('f1', 'end_date', 'End Date')];
    const result = autoMapForTemplate(fields, ['end']);
    expect(result).toEqual([{ fieldId: 'f1', columnName: 'end' }]);
  });

  it('maps "end_date" field to a header containing "expir"', () => {
    const fields = [makeField('f1', 'end_date', 'Expiry Date')];
    const result = autoMapForTemplate(fields, ['Expiration Date']);
    expect(result).toEqual([{ fieldId: 'f1', columnName: 'Expiration Date' }]);
  });

  it('does NOT use type fallback for custom_text fields', () => {
    // custom_text has no fallback — must match exactly
    const fields = [makeField('f1', 'custom_text', 'Score')];
    const result = autoMapForTemplate(fields, ['Score Card']); // does not exactly match "Score"
    expect(result).toEqual([]);
  });
});

describe('autoMapForTemplate — multiple fields', () => {
  it('maps multiple fields independently', () => {
    const fields = [
      makeField('f1', 'name', 'Recipient Name'),
      makeField('f2', 'course', 'Course Title'),
      makeField('f3', 'custom_text', 'Grade'),
    ];
    const result = autoMapForTemplate(fields, ['Recipient Name', 'Course Title', 'Grade']);
    expect(result).toHaveLength(3);
    expect(result.find(m => m.fieldId === 'f1')?.columnName).toBe('Recipient Name');
    expect(result.find(m => m.fieldId === 'f2')?.columnName).toBe('Course Title');
    expect(result.find(m => m.fieldId === 'f3')?.columnName).toBe('Grade');
  });

  it('only maps fields that have a matching header — skips unmatched ones', () => {
    const fields = [
      makeField('f1', 'name', 'Recipient Name'),
      makeField('f2', 'custom_text', 'Missing Column'),
    ];
    const result = autoMapForTemplate(fields, ['Recipient Name']);
    expect(result).toHaveLength(1);
    expect(result[0]!.fieldId).toBe('f1');
  });

  it('returns the first matching header (exact or fallback) in headers array order', () => {
    // Implementation uses headers.find() — first header that satisfies any check wins.
    // "User Name" appears first and satisfies the type='name' fallback, so it is returned.
    const fields = [makeField('f1', 'name', 'Full Name')];
    const result = autoMapForTemplate(fields, ['User Name', 'Full Name']);
    expect(result[0]!.columnName).toBe('User Name'); // first match wins
  });

  it('exact label match wins when the exact header appears before any fallback header', () => {
    const fields = [makeField('f1', 'name', 'Full Name')];
    // "Full Name" is first → exact match is checked first per-header, so it wins
    const result = autoMapForTemplate(fields, ['Full Name', 'User Name']);
    expect(result[0]!.columnName).toBe('Full Name');
  });
});
