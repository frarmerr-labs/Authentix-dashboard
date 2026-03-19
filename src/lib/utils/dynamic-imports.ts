/**
 * DYNAMIC IMPORTS
 *
 * Utilities for lazy loading heavy libraries to reduce initial bundle size.
 * These libraries are only loaded when actually needed.
 */

/**
 * Dynamically import pdf-lib for PDF manipulation
 */
export async function getPdfLib() {
  const pdfLib = await import("pdf-lib");
  return pdfLib;
}

/**
 * Dynamically import xlsx for Excel file handling
 */
export async function getXlsx() {
  const XLSX = await import("xlsx");
  return XLSX;
}

/**
 * Dynamically import jszip for ZIP file creation
 */
export async function getJsZip() {
  const JSZip = await import("jszip");
  return JSZip.default;
}

/**
 * Dynamically import qrcode for QR code generation
 */
export async function getQrCode() {
  const QRCode = await import("qrcode");
  return QRCode;
}

/**
 * Dynamically import csv-stringify for CSV generation
 */
export async function getCsvStringify() {
  const csv = await import("csv-stringify/sync");
  return csv;
}
