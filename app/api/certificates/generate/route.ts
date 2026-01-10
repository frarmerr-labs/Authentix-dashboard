import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import { CertificateField, FieldMapping } from '@/lib/types/certificate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, data, fieldMappings, options } = body;

    if (!template || !data || !fieldMappings) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For MVP, generate synchronously (for < 50 certificates)
    // For production, use background jobs for larger batches
    if (data.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 certificates per batch. For larger batches, contact support.' },
        { status: 400 }
      );
    }

    // Generate certificates
    const zip = new JSZip();
    const certificates = [];

    for (let i = 0; i < data.length; i++) {
      const rowData = data[i];

      try {
        let pdfDoc: PDFDocument;
        let firstPage: any;
        let pageWidth: number;
        let pageHeight: number;

        if (template.fileType === 'pdf') {
          // Load PDF template
          const pdfResponse = await fetch(template.fileUrl);
          const pdfBuffer = await pdfResponse.arrayBuffer();
          pdfDoc = await PDFDocument.load(pdfBuffer);
          const pages = pdfDoc.getPages();
          firstPage = pages[0];
          const size = firstPage.getSize();
          pageWidth = size.width;
          pageHeight = size.height;
        } else {
          // Create PDF from image template
          pdfDoc = await PDFDocument.create();
          const imageResponse = await fetch(template.fileUrl);
          const imageBuffer = await imageResponse.arrayBuffer();

          let image;
          if (template.fileUrl.includes('.png') || template.fileUrl.includes('image/png')) {
            image = await pdfDoc.embedPng(imageBuffer);
          } else {
            image = await pdfDoc.embedJpg(imageBuffer);
          }

          // Use template dimensions
          pageWidth = template.pdfWidth;
          pageHeight = template.pdfHeight;

          // Create page with image dimensions
          firstPage = pdfDoc.addPage([pageWidth, pageHeight]);

          // Draw the image to fill the page
          firstPage.drawImage(image, {
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
          });
        }

        // Add fields to the PDF
        for (const field of template.fields as CertificateField[]) {
          if (field.type === 'qr_code') {
            // Generate QR code
            if (options.includeQR) {
              const verificationToken = generateToken();
              const qrCodeDataUrl = await QRCode.toDataURL(
                `${process.env.NEXT_PUBLIC_APP_URL}/verify/${verificationToken}`
              );
              const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);

              firstPage.drawImage(qrImage, {
                x: field.x,
                y: pageHeight - field.y - field.height,
                width: field.width,
                height: field.height,
              });
            }
          } else {
            // Get the value from row data
            const mapping = fieldMappings.find((m: FieldMapping) => m.fieldId === field.id);
            if (!mapping) continue;

            let value = rowData[mapping.columnName];

            // Format dates
            if ((field.type === 'start_date' || field.type === 'end_date') && value) {
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  value = format(date, field.dateFormat || 'MMMM dd, yyyy');
                }
              } catch (e) {
                // Keep original value if date parsing fails
              }
            }

            // Add prefix/suffix
            const finalValue = `${field.prefix || ''}${value || ''}${field.suffix || ''}`;

            // Embed font
            const font = await getFont(pdfDoc, field.fontFamily);

            // Calculate text size
            const fontSize = field.fontSize;
            const textWidth = font.widthOfTextAtSize(finalValue, fontSize);

            // Calculate X position based on alignment
            let textX = field.x;
            if (field.textAlign === 'center') {
              textX = field.x + (field.width - textWidth) / 2;
            } else if (field.textAlign === 'right') {
              textX = field.x + field.width - textWidth;
            }

            // Convert color hex to RGB
            const color = hexToRgb(field.color);

            // Draw text
            firstPage.drawText(finalValue, {
              x: textX,
              y: pageHeight - field.y - field.height / 2 - fontSize / 3, // Center vertically
              size: fontSize,
              font: font,
              color: rgb(color.r / 255, color.g / 255, color.b / 255),
            });
          }
        }

        // Save the PDF
        const pdfBytes = await pdfDoc.save();

        // Generate filename
        const recipientName = getRecipientName(rowData, fieldMappings, template.fields);
        const fileName = sanitizeFileName(recipientName || `certificate_${i + 1}`);

        // Add to ZIP
        zip.file(`${fileName}.pdf`, pdfBytes);

        certificates.push({
          fileName: `${fileName}.pdf`,
          recipientName,
        });
      } catch (error) {
        console.error(`Error generating certificate ${i + 1}:`, error);
        // Continue with other certificates
      }
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // In production, upload to Supabase Storage and return URL
    // For now, return as base64 for direct download
    const base64Zip = zipBuffer.toString('base64');
    const downloadUrl = `data:application/zip;base64,${base64Zip}`;

    return NextResponse.json({
      success: true,
      downloadUrl,
      totalCertificates: certificates.length,
      certificates,
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper functions

async function getFont(pdfDoc: PDFDocument, fontFamily: string) {
  // Map font families to standard PDF fonts
  const fontMap: Record<string, any> = {
    'Arial': StandardFonts.Helvetica,
    'Helvetica': StandardFonts.Helvetica,
    'Times New Roman': StandardFonts.TimesRoman,
    'Times': StandardFonts.TimesRoman,
    'Courier': StandardFonts.Courier,
    'Courier New': StandardFonts.Courier,
  };

  const standardFont = fontMap[fontFamily] || StandardFonts.Helvetica;
  return await pdfDoc.embedFont(standardFont);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getRecipientName(
  rowData: Record<string, any>,
  fieldMappings: FieldMapping[],
  fields: CertificateField[]
): string {
  const nameField = fields.find((f) => f.type === 'name');
  if (!nameField) return 'certificate';

  const mapping = fieldMappings.find((m) => m.fieldId === nameField.id);
  if (!mapping) return 'certificate';

  return rowData[mapping.columnName] || 'certificate';
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-z0-9_\-]/gi, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
    .substring(0, 100);
}
