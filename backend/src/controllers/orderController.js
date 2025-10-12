// src/controllers/orderController.js - Sistema de Órdenes con Facturación Electrónica
import { PrismaClient } from '@prisma/client';
// CORRECTO: Así deben ser los imports en orderController.js
import { 
  generateInvoicePDF, 
  generateElectronicInvoiceXML,
  sendInvoiceEmail 
} from '../services/invoiceService.js';
import logger from '../../config/logger.js';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// === CONSTANTES ===
const INVOICE_STATUS = {
  PENDING: 'pendiente',
  GENERATED: 'generada',
  SENT: 'enviada',
  APPROVED: 'aprobada',
  REJECTED: 'rechazada'
};

const ORDER_STATUS_CODES = {
  RECEIVED: 'RECIBIDO',
  DIAGNOSED: 'DIAGNOSTICADO',
  PROFORMA_SENT: 'PROFORMA_ENVIADA',
  PROFORMA_APPROVED: 'PROFORMA_APROBADA',
  IN_PROGRESS: 'EN_PROGRESO',
  COMPLETED: 'COMPLETADO',
  INVOICED: 'FACTURADO',
  DELIVERED: 'ENTREGADO'
};

const ERROR_MESSAGES = {
  ORDER_NOT_FOUND: 'Orden no encontrada',
  UNAUTHORIZED_ACCESS: 'No tienes permisos para acceder a esta orden',
  INVOICE_ALREADY_GENERATED: 'La factura ya fue generada para esta orden',
  ORDER_NOT_COMPLETED: 'La orden debe estar completada antes de facturar',
  PROFORMA_NOT_APPROVED: 'La proforma debe estar aprobada antes de facturar',
  INVOICE_NOT_FOUND: 'Factura no encontrada'
};

// === UTILIDADES ===

const asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logger.error(`Error en ${fn.name}`, {
        error: error.message,
        stack: error.stack,
        userId: req.auth?.userId || req.auth?.clientId,
        path: req.path
      });
      
      const message = process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor' 
        : error.message;
      
      res.status(error.statusCode || 500).json({ 
        success: false,
        error: message 
      });
    }
  };
};

/**
 * Verifica si el usuario puede acceder a la orden
 */
const canAccessOrder = (order, req) => {
  // Empleados (especialmente Admin) pueden ver todas las órdenes
  if (req.auth.type === 'employee') {
    return true;
  }

  // Clientes solo pueden ver sus propias órdenes
  if (req.auth.type === 'client' && order.ClientId === req.auth.clientId) {
    return true;
  }

  return false;
};

/**
 * Genera número de factura secuencial
 */
const generateInvoiceNumber = async () => {
  // Obtener el último número de factura
  const lastInvoice = await prisma.invoice.findFirst({
    orderBy: { InvoiceNumber: 'desc' },
    select: { InvoiceNumber: true }
  });

  if (!lastInvoice) {
    return '001-001-000000001'; // Primer número
  }

  // Extraer y incrementar
  const parts = lastInvoice.InvoiceNumber.split('-');
  const sequence = parseInt(parts[2]) + 1;
  
  return `001-001-${sequence.toString().padStart(9, '0')}`;
};

// ========================================
// CONSULTA DE ÓRDENES
// ========================================

/**
 * Obtener todas las órdenes (Admin/Staff)
 * 
 * GET /api/orders/all
 * @auth Employee (Administrador, Staff)
 * @query { status?, clientId?, startDate?, endDate?, page?, limit? }
 */
export const getAllOrders = asyncHandler(async (req, res) => {
  const { 
    status, 
    clientId, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 50 
  } = req.query;

  // Construir filtros
  const where = {};
  if (status) where.CurrentStatusId = Number(status);
  if (clientId) where.ClientId = Number(clientId);
  if (startDate || endDate) {
    where.IntakeDate = {};
    if (startDate) where.IntakeDate.gte = new Date(startDate);
    if (endDate) where.IntakeDate.lte = new Date(endDate);
  }

  // Paginación
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [orders, total] = await Promise.all([
    prisma.serviceOrder.findMany({
      where,
      skip,
      take,
      include: {
        client: {
          select: {
            ClientId: true,
            DisplayName: true,
            Email: true,
            Phone: true
          }
        },
        equipment: { 
          include: { 
            equipmentType: {
              select: {
                EquipmentTypeId: true,
                Name: true
              }
            } 
          } 
        },
        receptionist: {
          select: {
            UserId: true,
            Username: true
          }
        },
        technician: {
          select: {
            UserId: true,
            Username: true
          }
        },
        status: {
          select: {
            StatusId: true,
            Name: true,
            Code: true
          }
        },
        invoice: {
          select: {
            InvoiceId: true,
            InvoiceNumber: true,
            IssueDate: true,
            TotalAmount: true
          }
        }
      },
      orderBy: { IntakeDate: 'desc' }
    }),
    prisma.serviceOrder.count({ where })
  ]);

  res.json({ 
    success: true,
    data: {
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

/**
 * Obtener órdenes por cliente (Cliente autenticado)
 * 
 * GET /api/orders/my-orders
 * @auth Client (Session)
 */
export const getOrdersByClient = asyncHandler(async (req, res) => {
  const clientId = req.auth.clientId;

  if (!clientId) {
    const error = new Error('Cliente no autenticado');
    error.statusCode = 401;
    throw error;
  }

  const orders = await prisma.serviceOrder.findMany({
    where: { ClientId: clientId },
    include: {
      equipment: { 
        include: { 
          equipmentType: true 
        } 
      },
      status: true,
      technician: {
        select: {
          Username: true
        }
      },
      // Incluir historial de estados para seguimiento
      histories: {
        include: {
          status: true
        },
        orderBy: { ChangedAt: 'desc' }
      },
      // Incluir factura si existe
      invoice: {
        select: {
          InvoiceId: true,
          InvoiceNumber: true,
          IssueDate: true,
          TotalAmount: true,
          Status: true,
          PDFPath: true,
          XMLPath: true
        }
      }
    },
    orderBy: { IntakeDate: 'desc' }
  });

  res.json({ 
    success: true,
    data: {
      orders,
      total: orders.length
    }
  });
});

/**
 * Obtener orden por ID con seguimiento completo
 * 
 * GET /api/orders/:id
 * @auth Hybrid (Employee or Client owner)
 */
export const getOrderById = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);

  const order = await prisma.serviceOrder.findUnique({
    where: { OrderId: orderId },
    include: {
      client: true,
      equipment: { 
        include: { 
          equipmentType: true 
        } 
      },
      receptionist: {
        select: {
          UserId: true,
          Username: true
        }
      },
      technician: {
        select: {
          UserId: true,
          Username: true
        }
      },
      status: true,
      // Historial completo de estados
      histories: { 
        include: { 
          status: true,
          changedBy: {
            select: {
              UserId: true,
              Username: true
            }
          }
        },
        orderBy: { ChangedAt: 'desc' }
      },
      // Entrada y salida del equipo
      equipmentEntry: {
        include: {
          receivedBy: {
            select: {
              Username: true
            }
          }
        }
      },
      equipmentExit: {
        include: {
          deliveredBy: {
            select: {
              Username: true
            }
          }
        }
      },
      // Factura si existe
      invoice: true
    }
  });

  if (!order) {
    const error = new Error(ERROR_MESSAGES.ORDER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Verificar permisos de acceso
  if (!canAccessOrder(order, req)) {
    const error = new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
    error.statusCode = 403;
    throw error;
  }

  res.json({ 
    success: true,
    data: { order }
  });
});

/**
 * Seguimiento de orden (Timeline visual)
 * 
 * GET /api/orders/:id/tracking
 * @auth Hybrid (Employee or Client owner)
 */
export const getOrderTracking = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);

  const order = await prisma.serviceOrder.findUnique({
    where: { OrderId: orderId },
    include: {
      client: {
        select: {
          ClientId: true,
          DisplayName: true
        }
      },
      status: true,
      histories: {
        include: {
          status: true,
          changedBy: {
            select: {
              Username: true
            }
          }
        },
        orderBy: { ChangedAt: 'asc' } // Orden cronológico
      }
    }
  });

  if (!order) {
    const error = new Error(ERROR_MESSAGES.ORDER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Verificar permisos
  if (!canAccessOrder(order, req)) {
    const error = new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
    error.statusCode = 403;
    throw error;
  }

  // Construir timeline
  const timeline = order.histories.map(history => ({
    statusName: history.status.Name,
    statusCode: history.status.Code,
    date: history.ChangedAt,
    notes: history.Notes,
    changedBy: history.changedBy?.Username || 'Sistema',
    isCurrentStatus: history.StatusId === order.CurrentStatusId
  }));

  res.json({ 
    success: true,
    data: {
      orderId: order.OrderId,
      identityTag: order.IdentityTag,
      currentStatus: {
        name: order.status.Name,
        code: order.status.Code
      },
      timeline,
      estimatedDelivery: order.EstimatedDeliveryDate,
      client: order.client
    }
  });
});

// ========================================
// SISTEMA DE FACTURACIÓN ELECTRÓNICA
// ========================================

/**
 * Generar factura electrónica para una orden completada
 * 
 * POST /api/orders/:id/generate-invoice
 * @auth Employee (Administrador, Staff Ventas)
 */
export const generateOrderInvoice = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  const userId = req.auth.userId;

  // Buscar orden con toda la información necesaria
  const order = await prisma.serviceOrder.findUnique({
    where: { OrderId: orderId },
    include: {
      client: true,
      equipment: {
        include: {
          equipmentType: true
        }
      },
      status: true,
      invoice: true // Verificar si ya tiene factura
    }
  });

  if (!order) {
    const error = new Error(ERROR_MESSAGES.ORDER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Verificar que la orden esté completada
  if (order.status.Code !== ORDER_STATUS_CODES.COMPLETED) {
    const error = new Error(ERROR_MESSAGES.ORDER_NOT_COMPLETED);
    error.statusCode = 400;
    throw error;
  }

  // Verificar que la proforma esté aprobada
  if (order.ProformaStatus !== 'aprobada') {
    const error = new Error(ERROR_MESSAGES.PROFORMA_NOT_APPROVED);
    error.statusCode = 400;
    throw error;
  }

  // Verificar si ya tiene factura
  if (order.invoice) {
    const error = new Error(ERROR_MESSAGES.INVOICE_ALREADY_GENERATED);
    error.statusCode = 400;
    throw error;
  }

  // Generar número de factura
  const invoiceNumber = await generateInvoiceNumber();

  // Generar factura en transacción
  const invoice = await prisma.$transaction(async (tx) => {
    // 1. Generar PDF
    const { buffer: pdfBuffer, filename: pdfFilename } = await generateInvoicePDF(order, invoiceNumber);
    
    // Guardar PDF
    const pdfDir = path.join(process.cwd(), 'storage', 'invoices', 'pdf');
    await fs.mkdir(pdfDir, { recursive: true });
    const pdfPath = path.join(pdfDir, pdfFilename);
    await fs.writeFile(pdfPath, pdfBuffer);

    // 2. Generar XML (Factura Electrónica SRI)
    const { xml, filename: xmlFilename } = await generateElectronicInvoiceXML(order, invoiceNumber);
    
    // Guardar XML
    const xmlDir = path.join(process.cwd(), 'storage', 'invoices', 'xml');
    await fs.mkdir(xmlDir, { recursive: true });
    const xmlPath = path.join(xmlDir, xmlFilename);
    await fs.writeFile(xmlPath, xml);

    // 3. Crear registro de factura en BD
    const newInvoice = await tx.invoice.create({
      data: {
        OrderId: order.OrderId,
        InvoiceNumber: invoiceNumber,
        IssueDate: new Date(),
        TotalAmount: order.TotalPrice,
        SubTotal: order.TotalPrice / 1.12, // Sin IVA
        Tax: order.TotalPrice - (order.TotalPrice / 1.12), // IVA 12%
        Status: INVOICE_STATUS.GENERATED,
        PDFPath: pdfPath,
        XMLPath: xmlPath,
        IssuedByUserId: userId
      }
    });

    // 4. Actualizar estado de la orden a FACTURADO
    const invoicedStatus = await tx.status.findUnique({
      where: { Code: ORDER_STATUS_CODES.INVOICED }
    });

    if (invoicedStatus) {
      await tx.serviceOrder.update({
        where: { OrderId: order.OrderId },
        data: { CurrentStatusId: invoicedStatus.StatusId }
      });

      await tx.orderStatusHistory.create({
        data: {
          OrderId: order.OrderId,
          StatusId: invoicedStatus.StatusId,
          Notes: `Factura generada: ${invoiceNumber}`,
          ChangedByUserId: userId
        }
      });
    }

    return newInvoice;
  });

  // Log de auditoría
  logger.info('Factura generada', {
    invoiceId: invoice.InvoiceId,
    invoiceNumber: invoice.InvoiceNumber,
    orderId: order.OrderId,
    clientId: order.ClientId,
    amount: invoice.TotalAmount,
    issuedBy: userId
  });

  res.status(201).json({ 
    success: true,
    message: 'Factura generada exitosamente',
    data: {
      invoice: {
        invoiceId: invoice.InvoiceId,
        invoiceNumber: invoice.InvoiceNumber,
        issueDate: invoice.IssueDate,
        totalAmount: invoice.TotalAmount,
        status: invoice.Status
      }
    }
  });
});

/**
 * Enviar factura por correo al cliente
 * 
 * POST /api/orders/:id/send-invoice
 * @auth Employee (Administrador, Staff Ventas)
 */
export const sendInvoiceToClient = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);

  const order = await prisma.serviceOrder.findUnique({
    where: { OrderId: orderId },
    include: {
      client: true,
      invoice: true
    }
  });

  if (!order) {
    const error = new Error(ERROR_MESSAGES.ORDER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  if (!order.invoice) {
    const error = new Error(ERROR_MESSAGES.INVOICE_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  if (!order.client.Email) {
    const error = new Error('El cliente no tiene email registrado');
    error.statusCode = 400;
    throw error;
  }

  // Leer archivos PDF y XML
  const [pdfBuffer, xmlBuffer] = await Promise.all([
    fs.readFile(order.invoice.PDFPath),
    fs.readFile(order.invoice.XMLPath)
  ]);

  // Enviar email con adjuntos
  await sendInvoiceEmail(
    order.client.Email,
    order.client.DisplayName,
    order.invoice.InvoiceNumber,
    pdfBuffer,
    xmlBuffer
  );

  // Actualizar estado de la factura
  await prisma.invoice.update({
    where: { InvoiceId: order.invoice.InvoiceId },
    data: { 
      Status: INVOICE_STATUS.SENT,
      SentDate: new Date()
    }
  });

  logger.info('Factura enviada por email', {
    invoiceId: order.invoice.InvoiceId,
    invoiceNumber: order.invoice.InvoiceNumber,
    clientEmail: order.client.Email
  });

  res.json({ 
    success: true,
    message: 'Factura enviada al cliente exitosamente'
  });
});

/**
 * Descargar factura PDF (Cliente o Empleado)
 * 
 * GET /api/orders/:id/download-invoice
 * @auth Hybrid (Employee or Client owner)
 */
export const downloadInvoicePDF = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);

  const order = await prisma.serviceOrder.findUnique({
    where: { OrderId: orderId },
    include: {
      client: {
        select: {
          ClientId: true
        }
      },
      invoice: true
    }
  });

  if (!order) {
    const error = new Error(ERROR_MESSAGES.ORDER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  if (!order.invoice) {
    const error = new Error(ERROR_MESSAGES.INVOICE_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Verificar permisos
  if (!canAccessOrder(order, req)) {
    const error = new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
    error.statusCode = 403;
    throw error;
  }

  // Leer archivo PDF
  const pdfBuffer = await fs.readFile(order.invoice.PDFPath);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="factura_${order.invoice.InvoiceNumber}.pdf"`
  );
  res.send(pdfBuffer);
});

/**
 * Descargar factura XML (Cliente o Empleado)
 * 
 * GET /api/orders/:id/download-invoice-xml
 * @auth Hybrid (Employee or Client owner)
 */
export const downloadInvoiceXML = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);

  const order = await prisma.serviceOrder.findUnique({
    where: { OrderId: orderId },
    include: {
      client: {
        select: {
          ClientId: true
        }
      },
      invoice: true
    }
  });

  if (!order) {
    const error = new Error(ERROR_MESSAGES.ORDER_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  if (!order.invoice) {
    const error = new Error(ERROR_MESSAGES.INVOICE_NOT_FOUND);
    error.statusCode = 404;
    throw error;
  }

  // Verificar permisos
  if (!canAccessOrder(order, req)) {
    const error = new Error(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
    error.statusCode = 403;
    throw error;
  }

  // Leer archivo XML
  const xmlBuffer = await fs.readFile(order.invoice.XMLPath);

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="factura_${order.invoice.InvoiceNumber}.xml"`
  );
  res.send(xmlBuffer);
});

/**
 * Listar facturas (Admin/Ventas)
 * 
 * GET /api/orders/invoices
 * @auth Employee (Administrador, Staff Ventas)
 */
export const listInvoices = asyncHandler(async (req, res) => {
  const { status, startDate, endDate, clientId } = req.query;

  const where = {};
  if (status) where.Status = status;
  if (clientId) where.order = { ClientId: Number(clientId) };
  if (startDate || endDate) {
    where.IssueDate = {};
    if (startDate) where.IssueDate.gte = new Date(startDate);
    if (endDate) where.IssueDate.lte = new Date(endDate);
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      order: {
        include: {
          client: {
            select: {
              ClientId: true,
              DisplayName: true,
              Email: true
            }
          }
        }
      },
      issuedBy: {
        select: {
          UserId: true,
          Username: true
        }
      }
    },
    orderBy: { IssueDate: 'desc' }
  });

  res.json({ 
    success: true,
    data: {
      invoices,
      total: invoices.length
    }
  });
});