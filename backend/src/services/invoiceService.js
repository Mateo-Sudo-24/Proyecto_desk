// services/invoiceService.js
import PDFDocument from 'pdfkit';
import stream from 'stream';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

/**
 * Genera un PDF de factura a partir de los datos de la orden.
 * @param {object} order - Orden con relaciones: client, equipment, status, receptionist, technician
 * @param {object} opts - { saveToDisk: boolean, outDir: string, filename: string }
 * @returns {Promise<{buffer: Buffer, filePath?: string}>}
 */
export async function generateInvoicePDF(order, opts = {}) {
  const { saveToDisk = false, outDir = './invoices', filename } = opts;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Collect chunks to buffer
  const buffers = [];
  doc.on('data', (chunk) => buffers.push(chunk));
  const ended = new Promise((resolve) => doc.on('end', () => resolve()));

  // --- Header ---
  doc.fontSize(18).text('Factura / Comprobante', { align: 'center' });
  doc.moveDown();

  // Company info (customize)
  doc.fontSize(10).text('Ecuatechnology S.A.', { continued: true }).text('   RUC: 1234567890');
  doc.text('Dirección: Av. Principal 123');
  doc.moveDown();

  // Invoice meta
  const invoiceNumber = filename || `INV-${order.IdentityTag || order.OrderId}`;
  doc.fontSize(12).text(`Factura: ${invoiceNumber}`);
  doc.text(`Fecha: ${new Date().toLocaleString()}`);
  doc.text(`Orden: ${order.IdentityTag || order.OrderId}`);
  doc.moveDown();

  // Client
  doc.fontSize(11).text('Cliente:', { underline: true });
  doc.fontSize(10).text(`${order.client?.DisplayName || 'N/D'}`);
  if (order.client?.IdNumber) doc.text(`ID: ${order.client.IdNumber}`);
  if (order.client?.Email) doc.text(`Email: ${order.client.Email}`);
  if (order.client?.Phone) doc.text(`Tel: ${order.client.Phone}`);
  doc.moveDown();

  // Equipo
  doc.fontSize(11).text('Equipo:', { underline: true });
  const eq = order.equipment;
  doc.fontSize(10).text(`${eq?.Brand || ''} ${eq?.Model || ''}`);
  if (eq?.SerialNumber) doc.text(`S/N: ${eq.SerialNumber}`);
  doc.text(`Tipo: ${eq?.equipmentType?.Name || 'N/D'}`);
  doc.moveDown();

  // Diagnóstico / repuestos
  doc.fontSize(11).text('Descripción del servicio / Diagnóstico', { underline: true });
  doc.fontSize(10).text(order.Diagnosis || order.Notes || 'Sin descripción');
  doc.moveDown();

  // Parts & pricing table (simple)
  doc.fontSize(11).text('Repuestos y totales', { underline: true });
  const partsText = order.Parts || 'No aplica';
  // Total price safety: may be Prisma Decimal -> convert to string/number
  const totalPrice = (order.TotalPrice && typeof order.TotalPrice.toNumber === 'function')
    ? order.TotalPrice.toNumber()
    : (order.TotalPrice ? Number(order.TotalPrice) : 0);
  doc.fontSize(10).text(`Repuestos: ${partsText}`);
  doc.text(`Total: $ ${Number.isFinite(totalPrice) ? totalPrice.toFixed(2) : String(totalPrice)}`);
  doc.moveDown();

  // Footer / signatures
  doc.moveDown(2);
  doc.text('---');
  doc.text(`Recepcionista: ${order.receptionist?.Username || 'N/D'}`);
  doc.text(`Técnico: ${order.technician?.Username || 'N/D'}`);
  doc.moveDown();
  doc.text('Gracias por confiar en nosotros.');

  doc.end();
  await ended;
  const buffer = Buffer.concat(buffers);

  let filePath;
  if (saveToDisk) {
    await fs.mkdir(outDir, { recursive: true });
    const safeName = filename || `invoice_${order.OrderId || order.IdentityTag || Date.now()}.pdf`;
    filePath = path.resolve(outDir, safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`);
    await fs.writeFile(filePath, buffer);
  }

  return { buffer, filePath };
}

/**
 * Envía la factura a una API externa (multipart/form-data)
 * @param {Buffer} pdfBuffer
 * @param {object} meta - { orderId, invoiceNumber, clientEmail, externalApiUrl, token }
 */
export async function sendInvoiceToExternalApp(pdfBuffer, meta = {}) {
  const { orderId, invoiceNumber, clientEmail, externalApiUrl, token } = meta;
  if (!externalApiUrl) throw new Error('externalApiUrl es requerido');

  // Usamos axios con form-data
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('file', pdfBuffer, { filename: `${invoiceNumber || 'invoice'}.pdf`, contentType: 'application/pdf' });
  form.append('orderId', String(orderId || ''));
  if (clientEmail) form.append('clientEmail', clientEmail);

  const headers = { ...form.getHeaders() };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await axios.post(externalApiUrl, form, { headers, maxContentLength: Infinity, maxBodyLength: Infinity });
  return res.data;
}
