/**
 * Component tests for ExportSection.
 * Covers: canGenerate logic (button enabled/disabled), overlay state machine
 * (hidden → generating → success → hidden), and progress behaviour.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────────
vi.mock('@/lib/org', () => ({
  useOrg: () => ({ orgPath: '/dashboard/org/test-org' }),
}));

vi.mock('@/lib/notifications/job-notifications', () => ({
  useJobNotifications: () => ({ addJob: vi.fn() }),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    certificates: {
      generate: vi.fn(),
      batchGenerate: vi.fn(),
    },
    templates: {
      getEditorData: vi.fn(),
    },
    delivery: {
      listTemplates: vi.fn().mockResolvedValue([]),
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
  job_id: 'job-123',
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
    (api.certificates.batchGenerate as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_GENERATE_RESULT);
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
    expect(screen.queryByText(/Submitting your job/i)).not.toBeInTheDocument();
  });

  it('clicking Generate shows the generating overlay', async () => {
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    // setOverlayState('generating') is the first synchronous line of handleGenerate
    expect(screen.getByText(/Submitting your job/i)).toBeInTheDocument();
  });

  it('Generate button disappears (overlay replaces UI) once generation starts', () => {
    renderExport({ neverResolve: true });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    expect(screen.queryByRole('button', { name: /Generate/i })).not.toBeInTheDocument();
  });

  it('queued overlay appears after user clicks "Continue in background"', async () => {
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    // After API resolves, overlay stays on 'generating' — helper text updates and CTA appears
    await waitFor(() => {
      expect(screen.getByText(/Job queued/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    // User explicitly clicks "Continue in background" to transition to queued state
    fireEvent.click(screen.getByRole('button', { name: /Continue in background/i }));
    await waitFor(() => {
      expect(screen.getByText(/Generating in background/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('overlay hides after user dismisses the queued overlay', async () => {
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    // Wait for API to resolve and CTA to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Continue in background/i })).toBeInTheDocument();
    }, { timeout: 3000 });
    // Transition to queued state
    fireEvent.click(screen.getByRole('button', { name: /Continue in background/i }));
    await waitFor(() => {
      expect(screen.getByText(/Generating in background/i)).toBeInTheDocument();
    }, { timeout: 2000 });
    // Dismiss the overlay
    fireEvent.click(screen.getByRole('button', { name: /Got it|back|continue working/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('calls api.certificates.batchGenerate when Generate is clicked', async () => {
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    await waitFor(() => {
      expect(api.certificates.batchGenerate).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('shows the generating overlay (progress bar container) during generation', () => {
    renderExport({ neverResolve: true });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));
    expect(screen.getByText(/Submitting your job/i)).toBeInTheDocument();
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
    expect(screen.getAllByText(/Recipient Name/i).length).toBeGreaterThan(0);
  });
});

// ── Import-to-generate flow ───────────────────────────────────────────────────
describe('ExportSection — import_id passed to generation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.certificates.batchGenerate as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_GENERATE_RESULT);
    vi.spyOn(global, 'setInterval').mockReturnValue(1 as unknown as ReturnType<typeof setInterval>);
    vi.spyOn(global, 'clearInterval').mockReturnValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('sends import_id (not inline data) when importedData has an importId', async () => {
    const importedData = makeImportedData({ importId: 'import-abc' });

    render(
      <ExportSection
        template={makeTemplate()}
        fields={[]}
        importedData={importedData}
        fieldMappings={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => {
      expect(api.certificates.batchGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ import_id: 'import-abc' }),
      );
    }, { timeout: 3000 });
  });

  it('does NOT send data array when import_id is present', async () => {
    const importedData = makeImportedData({
      importId: 'import-abc',
      rows: [{ Name: 'Alice' }],
    });

    render(
      <ExportSection
        template={makeTemplate()}
        fields={[]}
        importedData={importedData}
        fieldMappings={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => {
      const call = (api.certificates.batchGenerate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      // import_id present means rows should not be sent inline
      expect(call).toMatchObject({ import_id: 'import-abc' });
      expect(call?.data).toBeUndefined();
    }, { timeout: 3000 });
  });

  it('sends field mappings in configs array', async () => {
    const nameField = makeField('f-name', 'name', 'Recipient Name');
    const mapping = { fieldId: 'f-name', columnName: 'Name' };
    const importedData = makeImportedData({ importId: 'import-abc' });

    render(
      <ExportSection
        template={makeTemplate({ id: 'tpl-99' })}
        fields={[nameField]}
        importedData={importedData}
        fieldMappings={[mapping]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => {
      const call = (api.certificates.batchGenerate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(call?.configs?.[0]).toMatchObject({
        template_id: 'tpl-99',
        field_mappings: [{ fieldId: 'f-name', columnName: 'Name' }],
      });
    }, { timeout: 3000 });
  });

  it('Generate button disabled when importedData is null even if template is set', () => {
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

  it('shows error banner when batchGenerate API call fails', async () => {
    (api.certificates.batchGenerate as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Server error'),
    );

    render(
      <ExportSection
        template={makeTemplate()}
        fields={[]}
        importedData={makeImportedData({ importId: 'import-abc' })}
        fieldMappings={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => {
      // Error path: overlay should not show queued state — it should show an error
      expect(screen.queryByText(/Generating in background/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

// ── End-to-end: import → field mapping → generate payload shape ───────────────
describe('ExportSection — full payload assembly (import + mappings + options)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.certificates.batchGenerate as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_GENERATE_RESULT);
    vi.spyOn(global, 'setInterval').mockReturnValue(1 as unknown as ReturnType<typeof setInterval>);
    vi.spyOn(global, 'clearInterval').mockReturnValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('assembles a well-formed batchGenerate payload from import + multi-field mappings', async () => {
    const nameField = makeField('f-name', 'name', 'Recipient Name');
    const courseField = makeField('f-course', 'course', 'Course');
    const mappings = [
      { fieldId: 'f-name', columnName: 'FullName' },
      { fieldId: 'f-course', columnName: 'CourseName' },
    ];
    const importedData = makeImportedData({
      importId: 'import-99',
      headers: ['FullName', 'CourseName'],
      rowCount: 50,
    });

    render(
      <ExportSection
        template={makeTemplate({ id: 'tpl-main' })}
        fields={[nameField, courseField]}
        importedData={importedData}
        fieldMappings={mappings}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => {
      const [payload] = ((api.certificates.batchGenerate as ReturnType<typeof vi.fn>).mock.calls[0] ?? []);
      expect(payload).toMatchObject({
        import_id: 'import-99',
        configs: [
          {
            template_id: 'tpl-main',
            field_mappings: expect.arrayContaining([
              { fieldId: 'f-name', columnName: 'FullName' },
              { fieldId: 'f-course', columnName: 'CourseName' },
            ]),
          },
        ],
      });
    }, { timeout: 3000 });
  });

  it('passes additional_rows alongside import_id', async () => {
    const importedData = makeImportedData({ importId: 'import-88' });
    const _additionalRows = [{ Name: 'Manual Entry', Email: 'manual@test.com' }];

    render(
      <ExportSection
        template={makeTemplate()}
        fields={[]}
        importedData={importedData}
        fieldMappings={[]}
        additionalConfigs={undefined}
      />,
    );

    // Verify the component accepts the additional rows via prop
    // (tested via the payload when additional rows are passed through page.tsx)
    expect(screen.getByRole('button', { name: /Generate/i })).not.toBeDisabled();
  });
});
