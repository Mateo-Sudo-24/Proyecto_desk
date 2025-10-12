// services/invoiceService.js - EXPORTACIÓN CORREGIDA
import PDFDocument from 'pdfkit';
import stream from 'stream';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { XMLBuilder } from 'fast-xml-parser';

/**
 * Genera un PDF de factura profesional con formato ecuatoriano
 */
export async function generateInvoicePDF(order, invoiceNumber) {
  const doc = new PDFDocument({ 
    size: 'A4', 
    margin: 50,
    info: {
      Title: `Factura ${invoiceNumber}`,
      Author: 'Ecuatechnology S.A.',
      Subject: `Factura para orden ${order.IdentityTag}`
    }
  });

  const buffers = [];
  doc.on('data', (chunk) => buffers.push(chunk));
  const ended = new Promise((resolve) => doc.on('end', () => resolve()));

  // ===== ENCABEZADO =====
  doc.fillColor('#2c3e50')
     .fontSize(20)
     .font('Helvetica-Bold')
     .text('ECUATECHNOLOGY S.A.', 50, 50, { align: 'center' });
  
  doc.fillColor('#666')
     .fontSize(10)
     .font('Helvetica')
     .text('SERVICIOS TECNOLÓGICOS ESPECIALIZADOS', 50, 75, { align: 'center' });
  
  // Línea separadora
  doc.moveTo(50, 90)
     .lineTo(545, 90)
     .strokeColor('#e74c3c')
     .lineWidth(2)
     .stroke();
  
  doc.moveDown(3);

  // ===== INFORMACIÓN DE LA FACTURA =====
  doc.fillColor('#2c3e50')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('FACTURA', 50, 120);
  
  doc.fillColor('#333')
     .fontSize(10)
     .font('Helvetica')
     .text(`Número: ${invoiceNumber}`, 350, 120)
     .text(`Fecha: ${new Date().toLocaleDateString('es-EC')}`, 350, 135)
     .text(`Orden: ${order.IdentityTag}`, 350, 150);

  // ===== INFORMACIÓN DEL CLIENTE =====
  const clientY = 180;
  doc.fillColor('#2c3e50')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('INFORMACIÓN DEL CLIENTE', 50, clientY);
  
  doc.fillColor('#333')
     .fontSize(10)
     .font('Helvetica')
     .text(`Nombre: ${order.client?.DisplayName || 'N/D'}`, 50, clientY + 20)
     .text(`Identificación: ${order.client?.IdNumber || 'N/D'}`, 50, clientY + 35)
     .text(`Email: ${order.client?.Email || 'N/D'}`, 50, clientY + 50)
     .text(`Teléfono: ${order.client?.Phone || 'N/D'}`, 50, clientY + 65)
     .text(`Dirección: ${order.client?.Address || 'N/D'}`, 50, clientY + 80);

  // ===== INFORMACIÓN DEL EQUIPO =====
  const equipmentY = clientY + 110;
  doc.fillColor('#2c3e50')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('INFORMACIÓN DEL EQUIPO', 50, equipmentY);
  
  const equipment = order.equipment;
  doc.fillColor('#333')
     .fontSize(10)
     .font('Helvetica')
     .text(`Tipo: ${equipment?.equipmentType?.Name || 'N/D'}`, 50, equipmentY + 20)
     .text(`Marca: ${equipment?.Brand || 'N/D'}`, 50, equipmentY + 35)
     .text(`Modelo: ${equipment?.Model || 'N/D'}`, 50, equipmentY + 50)
     .text(`N/S: ${equipment?.SerialNumber || 'N/D'}`, 50, equipmentY + 65);

  // ===== DETALLES DEL SERVICIO =====
  const serviceY = equipmentY + 95;
  doc.fillColor('#2c3e50')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('DETALLES DEL SERVICIO', 50, serviceY);
  
  doc.fillColor('#333')
     .fontSize(10)
     .font('Helvetica')
     .text('Diagnóstico / Descripción del Servicio:', 50, serviceY + 20, { underline: true });
  
  // Texto de diagnóstico con wrap
  const diagnosis = order.Diagnosis || order.Notes || 'Servicio de reparación y mantenimiento técnico.';
  doc.text(diagnosis, 50, serviceY + 40, { 
    width: 495,
    align: 'justify'
  });

  // ===== TABLA DE COSTOS =====
  const tableY = serviceY + 80;
  const totalPrice = order.TotalPrice ? Number(order.TotalPrice) : 0;
  const subtotal = totalPrice / 1.12;
  const iva = totalPrice - subtotal;
  
  const tableHeaders = ['Descripción', 'Cantidad', 'P. Unitario', 'Total'];
  const tableWidths = [250, 80, 80, 80];
  const tableX = 50;
  
  // Encabezados de la tabla
  doc.fillColor('#2c3e50')
     .fontSize(10)
     .font('Helvetica-Bold');
  
  tableHeaders.forEach((header, i) => {
    const x = tableX + tableWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.text(header, x, tableY, { width: tableWidths[i] });
  });

  // Línea bajo encabezados
  doc.moveTo(tableX, tableY + 15)
     .lineTo(tableX + tableWidths.reduce((a, b) => a + b, 0), tableY + 15)
     .strokeColor('#bdc3c7')
     .lineWidth(1)
     .stroke();

  // Contenido de la tabla
  const rows = [
    ['Mano de obra técnica', '1', `$${subtotal.toFixed(2)}`, `$${subtotal.toFixed(2)}`],
    ['Repuestos y materiales', '1', 'Incluido', 'Incluido'],
    ['IVA 12%', '1', `$${iva.toFixed(2)}`, `$${iva.toFixed(2)}`],
  ];

  let currentY = tableY + 25;
  doc.fillColor('#333')
     .fontSize(9)
     .font('Helvetica');
  
  rows.forEach((row, rowIndex) => {
    row.forEach((cell, cellIndex) => {
      const x = tableX + tableWidths.slice(0, cellIndex).reduce((a, b) => a + b, 0);
      doc.text(cell, x, currentY, { width: tableWidths[cellIndex] });
    });
    currentY += 15;
  });

  // Línea de total
  doc.moveTo(tableX, currentY + 5)
     .lineTo(tableX + tableWidths.reduce((a, b) => a + b, 0), currentY + 5)
     .strokeColor('#2c3e50')
     .lineWidth(1)
     .stroke();

  // Total
  doc.fillColor('#2c3e50')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text('TOTAL:', tableX + tableWidths.slice(0, 2).reduce((a, b) => a + b, 0), currentY + 15)
     .text(`$${totalPrice.toFixed(2)}`, tableX + tableWidths.slice(0, 3).reduce((a, b) => a + b, 0), currentY + 15);

  // ===== PIE DE PÁGINA =====
  const footerY = 650;
  doc.fillColor('#666')
     .fontSize(8)
     .font('Helvetica')
     .text('Ecuatechnology S.A. - RUC: 1798282737001', 50, footerY, { align: 'center' })
     .text('Av. Principal 123, Quito - Ecuador | Tel: +593 2 1234567', 50, footerY + 12, { align: 'center' })
     .text('Email: info@ecuatechnology.com | www.ecuatechnology.com', 50, footerY + 24, { align: 'center' })
     .text('Gracias por confiar en nuestros servicios técnicos especializados', 50, footerY + 40, { align: 'center' });

  doc.end();
  await ended;
  
  const buffer = Buffer.concat(buffers);
  const filename = `factura_${invoiceNumber}.pdf`.replace(/-/g, '_');

  return { buffer, filename };
}

/**
 * Genera XML para facturación electrónica según estándares SRI Ecuador
 */
export async function generateElectronicInvoiceXML(order, invoiceNumber) {
  const totalPrice = order.TotalPrice ? Number(order.TotalPrice) : 0;
  const subtotal = totalPrice / 1.12;
  const iva = totalPrice - subtotal;
  
  // Extraer componentes del número de factura
  const [estab, ptoEmi, secuencial] = invoiceNumber.split('-');
  
  // Generar clave de acceso
  const claveAcceso = generarClaveAccesoCompleta(invoiceNumber);

  // Estructura EXACTA para factura electrónica SRI Ecuador
  const facturaElectronica = {
    'factura': {
      '@id': 'comprobante',
      '@version': '1.0.0',
      'infoTributaria': {
        'ambiente': '1', // 1=Pruebas, 2=Producción
        'tipoEmision': '1', // 1=Normal
        'razonSocial': 'ECUATECHNOLOGY S.A.',
        'nombreComercial': 'ECUATECHNOLOGY SERVICIOS TECNOLOGICOS',
        'ruc': '1798282737001',
        'claveAcceso': claveAcceso,
        'codDoc': '01', // 01=Factura
        'estab': estab,
        'ptoEmi': ptoEmi,
        'secuencial': secuencial,
        'dirMatriz': 'AV. AMAZONAS N12-123 Y AV. PATRIA, QUITO - PICHINCHA'
      },
      'infoFactura': {
        'fechaEmision': new Date().toISOString().split('T')[0],
        'dirEstablecimiento': 'AV. AMAZONAS N12-123 Y AV. PATRIA',
        'obligadoContabilidad': 'NO',
        'tipoIdentificacionComprador': identificarTipoDocumento(order.client?.IdType, order.client?.IdNumber),
        'razonSocialComprador': order.client?.DisplayName?.toUpperCase() || 'CONSUMIDOR FINAL',
        'identificacionComprador': order.client?.IdNumber || '9999999999999',
        'totalSinImpuestos': subtotal.toFixed(2),
        'totalDescuento': '0.00',
        'totalConImpuestos': {
          'totalImpuesto': [
            {
              'codigo': '2', // 2=IVA
              'codigoPorcentaje': '0', // 0=0%
              'baseImponible': '0.00',
              'valor': '0.00'
            },
            {
              'codigo': '2', // 2=IVA
              'codigoPorcentaje': '2', // 2=12%
              'baseImponible': subtotal.toFixed(2),
              'valor': iva.toFixed(2)
            }
          ]
        },
        'propina': '0.00',
        'importeTotal': totalPrice.toFixed(2),
        'moneda': 'DOLAR'
      },
      'detalles': {
        'detalle': [
          {
            'codigoPrincipal': 'SRV-TEC-001',
            'codigoAuxiliar': 'SERV-TECNICO',
            'descripcion': `REPARACION Y MANTENIMIENTO DE EQUIPO ${order.equipment?.equipmentType?.Name?.toUpperCase() || 'TECNOLOGICO'}`,
            'cantidad': '1.000',
            'precioUnitario': subtotal.toFixed(2),
            'descuento': '0.00',
            'precioTotalSinImpuesto': subtotal.toFixed(2),
            'impuestos': {
              'impuesto': [
                {
                  'codigo': '2',
                  'codigoPorcentaje': '0',
                  'tarifa': '0.00',
                  'baseImponible': '0.00',
                  'valor': '0.00'
                },
                {
                  'codigo': '2',
                  'codigoPorcentaje': '2',
                  'tarifa': '12.00',
                  'baseImponible': subtotal.toFixed(2),
                  'valor': iva.toFixed(2)
                }
              ]
            }
          }
        ]
      },
      'infoAdicional': {
        'campoAdicional': [
          {
            '@nombre': 'Direccion',
            '#text': order.client?.Address || 'CIUDAD'
          },
          {
            '@nombre': 'Telefono',
            '#text': order.client?.Phone || 'NO REGISTRA'
          },
          {
            '@nombre': 'Email',
            '#text': order.client?.Email || 'NO REGISTRA'
          },
          {
            '@nombre': 'OrdenServicio',
            '#text': order.IdentityTag || `OS-${order.OrderId}`
          },
          {
            '@nombre': 'Equipo',
            '#text': `${order.equipment?.Brand || ''} ${order.equipment?.Model || ''}`.trim() || 'EQUIPO TECNOLOGICO'
          },
          {
            '@nombre': 'Serial',
            '#text': order.equipment?.SerialNumber || 'N/A'
          },
          {
            '@nombre': 'Diagnostico',
            '#text': (order.Diagnosis || 'SERVICIO TECNICO ESPECIALIZADO').substring(0, 100)
          }
        ]
      }
    }
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
    processEntities: true,
    suppressBooleanAttributes: false
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(facturaElectronica.factura)}`;
  const filename = `${claveAcceso}.xml`;

  return { xml, filename };
}

/**
 * Envía factura por correo electrónico al cliente
 */
export async function sendInvoiceEmail(clientEmail, clientName, invoiceNumber, pdfBuffer, xmlBuffer) {
  // En un entorno real, aquí integrarías con un servicio de email
  // como SendGrid, AWS SES, o un SMTP server
  
  console.log(`📧 Simulando envío de factura ${invoiceNumber} a: ${clientEmail}`);
  console.log(`👋 Cliente: ${clientName}`);
  console.log(`📎 Archivos: PDF (${pdfBuffer.length} bytes), XML (${xmlBuffer.length} bytes)`);
  
  // Simulación de envío exitoso
  return {
    success: true,
    messageId: `simulated-${Date.now()}`,
    clientEmail,
    invoiceNumber
  };
}

/**
 * Envía la factura a una API externa
 */
export async function sendInvoiceToExternalApp(pdfBuffer, meta = {}) {
  const { orderId, invoiceNumber, clientEmail, externalApiUrl, token } = meta;
  
  if (!externalApiUrl) {
    console.log('⚠️  No externalApiUrl provided, skipping external app integration');
    return { success: true, skipped: true };
  }

  try {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    
    form.append('file', pdfBuffer, { 
      filename: `${invoiceNumber || 'invoice'}.pdf`, 
      contentType: 'application/pdf' 
    });
    form.append('orderId', String(orderId || ''));
    if (clientEmail) form.append('clientEmail', clientEmail);

    const headers = { ...form.getHeaders() };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.post(externalApiUrl, form, { 
      headers, 
      maxContentLength: Infinity, 
      maxBodyLength: Infinity 
    });
    
    console.log(`✅ Factura enviada a app externa: ${externalApiUrl}`);
    return res.data;
    
  } catch (error) {
    console.error('❌ Error enviando factura a app externa:', error.message);
    // No lanzamos error para no bloquear el flujo principal
    return { success: false, error: error.message };
  }
}

// ===== FUNCIONES AUXILIARES =====

/**
 * Genera clave de acceso completa según especificaciones SRI Ecuador
 */
function generarClaveAccesoCompleta(invoiceNumber) {
  const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const [estab, ptoEmi, secuencial] = invoiceNumber.split('-');
  
  // Datos fijos para la clave de acceso
  const ruc = '1798282737001';
  const ambiente = '1'; // 1=Pruebas
  const tipoComprobante = '01'; // 01=Factura
  const numeroRandom = Math.floor(Math.random() * 90000000) + 10000000; // 8 dígitos
  
  // Construir clave base (43 dígitos)
  const claveBase = [
    fecha,                    // 8 dígitos (YYYYMMDD)
    tipoComprobante,          // 2 dígitos
    ruc,                      // 13 dígitos
    ambiente,                 // 1 dígito
    estab,                    // 3 dígitos
    ptoEmi,                   // 3 dígitos
    secuencial,               // 9 dígitos
    numeroRandom,             // 8 dígitos
    '1'                       // 1 dígito (tipo emisión)
  ].join('');
  
  // Calcular dígito verificador (algoritmo módulo 11)
  const digitoVerificador = calcularDigitoVerificador(claveBase);
  
  return claveBase + digitoVerificador;
}

/**
 * Calcula el dígito verificador usando algoritmo módulo 11 del SRI
 */
function calcularDigitoVerificador(claveBase) {
  const factores = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2];
  
  let suma = 0;
  for (let i = 0; i < claveBase.length; i++) {
    const digito = parseInt(claveBase[i]);
    const factor = factores[factores.length - 1 - i];
    suma += digito * factor;
  }
  
  const modulo = 11;
  const residuo = suma % modulo;
  const digitoVerificador = residuo === 0 ? 0 : residuo === 1 ? 1 : modulo - residuo;
  
  return digitoVerificador.toString();
}

/**
 * Identifica el tipo de documento según especificaciones SRI
 */
function identificarTipoDocumento(idType, idNumber) {
  if (!idNumber) return '07'; // Consumidor final
  
  const cleanId = idNumber.replace(/\D/g, '');
  
  if (idType === 'cedula' || cleanId.length === 10) {
    return '05'; // Cédula
  } else if (idType === 'ruc' || cleanId.length === 13) {
    return '04'; // RUC
  } else if (idType === 'pasaporte') {
    return '06'; // Pasaporte
  } else {
    return '07'; // Consumidor final
  }
}

// ✅ EXPORTACIÓN CORRECTA - Named Exports
export default {
  generateInvoicePDF,
  generateElectronicInvoiceXML,
  sendInvoiceEmail,
  sendInvoiceToExternalApp
};