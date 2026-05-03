/**
 * WRAP-PDF ROUTE
 *
 * Server-side: fetches a Supabase signed image URL and wraps it in a PDF.
 * Avoids browser CORS issues when fetching signed storage URLs.
 *
 * Security: only allows Supabase storage origin to prevent SSRF.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

const ALLOWED_ORIGINS = [/^https:\/\/[a-z0-9-]+\.supabase\.co\//];

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_ORIGINS.some(re => re.test(url));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  if (!isSafeUrl(imageUrl)) {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
  }

  let imageBytes: ArrayBuffer;
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    imageBytes = await res.arrayBuffer();
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 502 },
    );
  }

  try {
    const pdfDoc = await PDFDocument.create();

    // Embed as PNG (works for both PNG and JPEG)
    let img;
    try {
      img = await pdfDoc.embedPng(imageBytes);
    } catch {
      img = await pdfDoc.embedJpg(imageBytes);
    }

    const { width, height } = img;

    // A4 portrait: 595 × 842 pt. Scale image to fit while preserving aspect ratio.
    const A4_W = 595;
    const A4_H = 842;
    const scale = Math.min(A4_W / width, A4_H / height);
    const drawW = width * scale;
    const drawH = height * scale;
    const x = (A4_W - drawW) / 2;
    const y = (A4_H - drawH) / 2;

    const page = pdfDoc.addPage([A4_W, A4_H]);
    page.drawImage(img, { x, y, width: drawW, height: drawH });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="certificate.pdf"',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
