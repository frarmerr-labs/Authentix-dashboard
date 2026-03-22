/**
 * Component tests for ExportSection.
 * Covers: canGenerate logic (button enabled/disabled), overlay state machine
 * (hidden → generating → success → hidden), and progress behaviour.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mocks ──────────────────────────────────────────────────────────────────────
vi.mock('@/lib/api/client', () => ({
  api: {
    certificates: {
      generate: vi.fn(),
    },
    templates: {
      getEditorData: vi.fn(),
    },
  },
}));

vi.mock('@/app/dashboard/org/[slug]/generate-certificate/components/ExpiryDateSelector', () => ({
  ExpiryDateSelector: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="expiry-selector">{children}</div>
  ),
}));

vi.mock('@/app/dashboard/org/[slug]/generate-certificate/components/CertificateTable', () => ({
  CertificateTable: () => <div data-testid="cert-table" />,
}));

import { ExportSection } from '@/app/dashboard/org/[slug]/generate-certificate/components/ExportSection';
import { api } from '@/lib/api/client';
import type { CertificateTemplate, ImportedData, FieldMapping, CertificateField } from '@/lib/types/certificate';

// ── Factories ──────────────────────────────────────────────────────────────────
function makeTemplate(overrides: Partial<CertificateTemplate> = {}): CertificateTemplate {
  return {
    id: 'tpl-1',
    templateName: 'Test Certificate',
    fileUrl: 'https://example.com/template.pdf',
    fileType: 'pdf',
    pdfWidth: 800,
    pdfHeight: 600,
    fields: [],
    ...overrides,
  };
}

function makeImportedData(overrides: Partial<ImportedData> = {}): ImportedData {
  return {
    fileName: 'recipients.xlsx',
    headers: ['Name', 'Email'],
    rows: [{ Name: 'Alice', Email: 'alice@example.com' }],
    rowCount: 1,
    ...overrides,
  };
}

function makeField(id: string, type: CertificateField['type'] = 'name', label = 'Name'): CertificateField {
  return {
    id, type, label,
    x: 0, y: 0, width: 200, height: 30,
    fontSize: 14, fontFamily: 'Arial', color: '#000',
    fontWeight: '400', fontStyle: 'normal', textAlign: 'left',
  };
}

const MOCK_GENERATE_RESULT = {
  certificates: [
    {
      id: 'cert-1',
      certificate_number: 'CERT-001',
      recipient_name: 'Alice',
      recipient_email: 'alice@example.com',
      issued_at: '2026-01-15T00:00:00Z',
      expires_at: null,
      download_url: 'https://storage.example.com/cert.pdf',
      preview_url: 'https://storage.example.com/cert-preview.jpg',
    },
  ],
  zip_download_url: null,
};

// ── canGenerate logic ──────────────────────────────────────────────────────────
describe('ExportSection — generate button state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Generate button is disabled when template is null', () => {
    render(
      <ExportSection
        template={null}
        fields={[]}
        importedData={makeImportedData()}
        fieldMappings={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /Generate/i })).toBeDisabled();
  });

  it('Generate button is disabled when template has no id', () => {
    render(
      <ExportSection
        template={{ ...makeTemplate(), id: undefined }}
        fields={[]}
        importedData={makeImportedData()}
        fieldMappings={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /Generate/i })).toBeDisabled();
  });

  it('Generate button is disabled when importedData is null', () => {
    render(
      <ExportSection
        template={makeTemplate()}
        fields={[]}
        importedData={null}
        fieldMappings={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /Generate/i })).toBeDisabled();
  });

  it('Generate button is enabled when template has id and importedData is provided (no mappable fields)', () => {
    render(
      <ExportSection
        template={makeTemplate()}
        fields={[]}  // no mappable fields → allMappableFieldsMapped = true vacuously
        importedData={makeImportedData()}
        fieldMappings={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /Generate/i })).not.toBeDisabled();
  });

  it('Generate button is disabled when a mappable field has no mapping', () => {
    const nameField = makeField('f1', 'name', 'Recipient Name');
    render(
      <ExportSection
        template={makeTemplate()}
        fields={[nameField]}
        importedData={makeImportedData()}
        fieldMappings={[]}  // field has no mapping
      />,
    );
    expect(screen.getByRole('button', { name: /Generate/i })).toBeDisabled();
  });

  it('Generate button is enabled when all mappable fields have mappings', () => {
    const nameField = makeField('f1', 'name', 'Recipient Name');
    const mapping: FieldMapping = { fieldId: 'f1', columnName: 'Name' };
    render(
      <ExportSection
        template={makeTemplate()}
        fields={[nameField]}
        importedData={makeImportedData()}
        fieldMappings={[mapping]}
      />,
    );
    expect(screen.getByRole('button', { name: /Generate/i })).not.toBeDisabled();
  });

  it('qr_code and custom_text and image fields do NOT count as mappable (button stays enabled)', () => {
    const qrField = makeField('qr-1', 'qr_code', 'QR Code');
    const imgField = makeField('img-1', 'image', 'Signature');
    const txtField = makeField('txt-1', 'custom_text', 'Static Label');
    render(
      <ExportSection
        template={makeTemplate()}
        fields={[qrField, imgField, txtField]}
        importedData={makeImportedData()}
        fieldMappings={[]}  // no mappings — but none are needed
      />,
    );
    expect(screen.getByRole('button', { name: /Generate/i })).not.toBeDisabled();
  });
});

// ── Overlay state machine ──────────────────────────────────────────────────────
// Uses fireEvent (synchronous) to avoid fake-timer + userEvent interaction issues.
// setInterval (progress simulator) is stubbed to a no-op so it doesn't produce
// out-of-act React state updates that stall waitFor.
describe('ExportSection — generation overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.certificates.generate as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_GENERATE_RESULT);
    // Stub the progress interval so it doesn't fire during tests
    vi.spyOn(global, 'setInterval').mockReturnValue(1 as unknown as ReturnType<typeof setInterval>);
    vi.spyOn(global, 'clearInterval').mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderExport(overrides: { neverResolve?: boolean; templateId?: string; data?: ImportedData } = {}) {
    if (overrides.neverResolve) {
      (api.certificates.generate as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    }
    return render(
      <ExportSection
        template={makeTemplate({ id: overrides.templateId ?? 'tpl-1' })}
        fields={[]}
        importedData={overrides.data ?? makeImportedData()}
        fieldMappings={[]}
      />,
    );
  }

  it('overlay is NOT visible before generation starts', () => {
    renderExport();
    expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
    expect(screen.queryByText(/please keep this page open/i)).not.toBeInTheDocument();
  });

  it('clicking Generate shows the generating overlay', async () => {
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    // setOverlayState('generating') is the first synchronous line of handleGenerate
    expect(screen.getByText(/please keep this page open/i)).toBeInTheDocument();
  });

  it('Generate button disappears (overlay replaces UI) once generation starts', () => {
    renderExport({ neverResolve: true });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    expect(screen.queryByRole('button', { name: /Generate/i })).not.toBeInTheDocument();
  });

  it('success overlay appears after API call resolves', async () => {
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    await waitFor(() => {
      expect(screen.getByText(/generated successfully/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('overlay hides after the 2500ms success animation timer fires', async () => {
    // Real timers — the progress setInterval is mocked in beforeEach so it won't fire,
    // but the dismiss setTimeout(2500ms) fires naturally.
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    // Wait for success state (API mock resolves in next microtask)
    await waitFor(() => {
      expect(screen.getByText(/generated successfully/i)).toBeInTheDocument();
    }, { timeout: 2000 });
    // Wait for the real 2500ms dismiss timer to fire
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
    }, { timeout: 4000 });
  }, 8000);

  it('calls api.certificates.generate with the correct template_id and data', () => {
    // api.certificates.generate is called synchronously before the first await in handleGenerate
    const data = makeImportedData();
    render(
      <ExportSection
        template={makeTemplate({ id: 'tpl-xyz' })}
        fields={[]}
        importedData={data}
        fieldMappings={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    // Verify synchronous call — no waitFor needed
    expect(api.certificates.generate).toHaveBeenCalledWith(
      expect.objectContaining({ template_id: 'tpl-xyz', data: data.rows }),
    );
  });

  it('shows the generating overlay (progress bar container) during generation', () => {
    renderExport({ neverResolve: true });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    expect(screen.getByText(/please keep this page open/i)).toBeInTheDocument();
  });
});

// ── Unmapped fields warning ────────────────────────────────────────────────────
describe('ExportSection — unmapped fields warning', () => {
  it('shows warning when a name field has no mapping', () => {
    const nameField = makeField('f1', 'name', 'Recipient Name');
    render(
      <ExportSection
        template={makeTemplate()}
        fields={[nameField]}
        importedData={makeImportedData()}
        fieldMappings={[]}
      />,
    );
    expect(screen.getByText(/Recipient Name/i)).toBeInTheDocument();
  });
});
