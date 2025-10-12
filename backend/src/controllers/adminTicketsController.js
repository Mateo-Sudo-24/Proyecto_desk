// adminTicketController.js - Gestión de tickets por administradores y staff
import { PrismaClient } from '@prisma/client';
import { sendTicketUpdateEmail } from '../../config/nodemailer.js';

const prisma = new PrismaClient();

// === CONSTANTES ===
const TICKET_STATUS = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

const TICKET_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// === UTILIDADES ===
const logError = (context, error, metadata = {}) => {
  console.error(`[ADMIN TICKET - ${context}]`, {
    message: error.message,
    stack: error.stack,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

const asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logError(fn.name, error, { 
        userId: req.session?.userId || req.user?.id,
        body: req.body,
        params: req.params 
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

// === GESTIÓN DE TICKETS ===

/**
 * Listar todos los tickets con filtros
 * Disponible para: Administrador, Recepcionista
 */
export const listAllTickets = asyncHandler(async (req, res) => {
  const { status, priority, assignedTo, category, clientId, orderId } = req.query;

  // Construir filtros dinámicos
  const where = {};
  if (status) where.Status = status;
  if (priority) where.Priority = priority;
  if (assignedTo) where.AssignedToUserId = Number(assignedTo);
  if (category) where.CategoryId = Number(category);
  if (clientId) where.ClientId = Number(clientId);
  if (orderId) where.OrderId = Number(orderId);

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      client: {
        select: {
          ClientId: true,
          DisplayName: true,
          Email: true,
          Phone: true
        }
      },
      order: {
        select: {
          OrderId: true,
          IdentityTag: true,
          CurrentStatusId: true,
          status: true
        }
      },
      category: true,
      assignedTo: {
        select: {
          UserId: true,
          Username: true,
          Email: true
        }
      },
      responses: {
        select: {
          ResponseId: true,
          CreatedAt: true
        }
      }
    },
    orderBy: [
      { Priority: 'desc' },
      { CreatedAt: 'desc' }
    ]
  });

  // Agregar contadores
  const ticketsWithMetrics = tickets.map(ticket => ({
    ...ticket,
    responseCount: ticket.responses.length,
    responses: undefined // Remover detalle, solo contador
  }));

  res.json({
    success: true,
    data: {
      tickets: ticketsWithMetrics,
      total: ticketsWithMetrics.length,
      summary: {
        open: tickets.filter(t => t.Status === 'open').length,
        assigned: tickets.filter(t => t.Status === 'assigned').length,
        inProgress: tickets.filter(t => t.Status === 'in_progress').length,
        resolved: tickets.filter(t => t.Status === 'resolved').length,
        closed: tickets.filter(t => t.Status === 'closed').length
      }
    }
  });
});

/**
 * Ver detalles completos de un ticket
 */
export const getTicketDetails = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;

  const ticket = await prisma.ticket.findUnique({
    where: { TicketId: Number(ticketId) },
    include: {
      client: true,
      order: {
        include: {
          equipment: {
            include: {
              equipmentType: true
            }
          },
          status: true,
          technician: {
            select: {
              UserId: true,
              Username: true
            }
          }
        }
      },
      category: true,
      assignedTo: {
        select: {
          UserId: true,
          Username: true,
          Email: true
        }
      },
      responses: {
        include: {
          respondedByUser: {
            select: {
              UserId: true,
              Username: true
            }
          },
          respondedByClient: {
            select: {
              ClientId: true,
              DisplayName: true
            }
          }
        },
        orderBy: { CreatedAt: 'asc' }
      },
      attachments: true
    }
  });

  if (!ticket) {
    const error = new Error('Ticket no encontrado');
    error.statusCode = 404;
    throw error;
  }

  res.json({
    success: true,
    data: { ticket }
  });
});

/**
 * Asignar ticket a un usuario
 * Disponible para: Administrador
 */
export const assignTicket = asyncHandler(async (req, res) => {
  const { ticketId, assignedToUserId } = req.body;
  const adminUserId = req.session?.userId || req.user?.id;

  // Verificar que el usuario asignado existe
  const assignedUser = await prisma.user.findUnique({
    where: { UserId: Number(assignedToUserId) },
    select: {
      UserId: true,
      Username: true,
      Email: true,
      Active: true
    }
  });

  if (!assignedUser || !assignedUser.Active) {
    const error = new Error('Usuario asignado no encontrado o inactivo');
    error.statusCode = 400;
    throw error;
  }

  const ticket = await prisma.ticket.update({
    where: { TicketId: Number(ticketId) },
    data: {
      AssignedToUserId: assignedUser.UserId,
      Status: TICKET_STATUS.ASSIGNED,
      UpdatedAt: new Date()
    },
    include: {
      client: true,
      order: true,
      category: true
    }
  });

  // Registrar respuesta automática
  await prisma.ticketResponse.create({
    data: {
      TicketId: ticket.TicketId,
      Message: `Ticket asignado a ${assignedUser.Username}`,
      RespondedByUserId: adminUserId,
      IsInternal: true
    }
  });

  console.log('[TICKET ASSIGNED]', {
    ticketId: ticket.TicketId,
    assignedTo: assignedUser.UserId,
    assignedBy: adminUserId,
    timestamp: new Date().toISOString()
  });

  // Notificar al usuario asignado (opcional)
  // await sendTicketAssignmentEmail(assignedUser.Email, ticket);

  res.json({
    success: true,
    message: `Ticket asignado a ${assignedUser.Username}`,
    data: { ticket }
  });
});

/**
 * Actualizar estado de un ticket
 */
export const updateTicketStatus = asyncHandler(async (req, res) => {
  const { ticketId, status, notes } = req.body;
  const userId = req.session?.userId || req.user?.id;

  if (!Object.values(TICKET_STATUS).includes(status)) {
    const error = new Error('Estado inválido');
    error.statusCode = 400;
    throw error;
  }

  const updateData = {
    Status: status,
    UpdatedAt: new Date()
  };

  // Si se marca como resuelto, agregar fecha
  if (status === TICKET_STATUS.RESOLVED && !updateData.ResolvedAt) {
    updateData.ResolvedAt = new Date();
  }

  // Si se marca como cerrado, agregar fecha
  if (status === TICKET_STATUS.CLOSED && !updateData.ClosedAt) {
    updateData.ClosedAt = new Date();
  }

  const ticket = await prisma.ticket.update({
    where: { TicketId: Number(ticketId) },
    data: updateData,
    include: {
      client: true,
      order: true
    }
  });

  // Registrar cambio en respuestas
  await prisma.ticketResponse.create({
    data: {
      TicketId: ticket.TicketId,
      Message: notes || `Estado actualizado a: ${status}`,
      RespondedByUserId: userId,
      IsInternal: false
    }
  });

  // Notificar al cliente
  if (ticket.client?.Email) {
    sendTicketUpdateEmail(
      ticket.client.Email,
      ticket.client.DisplayName,
      ticket.TicketNumber,
      status
    ).catch(err => logError('sendTicketUpdateEmail', err));
  }

  res.json({
    success: true,
    message: 'Estado del ticket actualizado',
    data: { ticket }
  });
});

/**
 * Agregar respuesta a un ticket
 */
export const addTicketResponse = asyncHandler(async (req, res) => {
  const { ticketId, message, isInternal } = req.body;
  const userId = req.session?.userId || req.user?.id;

  const response = await prisma.ticketResponse.create({
    data: {
      TicketId: Number(ticketId),
      Message: message,
      RespondedByUserId: userId,
      IsInternal: isInternal || false
    },
    include: {
      respondedByUser: {
        select: {
          UserId: true,
          Username: true
        }
      }
    }
  });

  // Actualizar fecha de actualización del ticket
  await prisma.ticket.update({
    where: { TicketId: Number(ticketId) },
    data: { UpdatedAt: new Date() }
  });

  res.json({
    success: true,
    message: 'Respuesta agregada exitosamente',
    data: { response }
  });
});

/**
 * Modificar orden relacionada con ticket
 * Solo Administrador puede hacer cambios directos
 */
export const modifyOrderFromTicket = asyncHandler(async (req, res) => {
  const { ticketId, orderId, modifications } = req.body;
  const adminUserId = req.session?.userId || req.user?.id;

  // Verificar que el ticket existe y está relacionado a la orden
  const ticket = await prisma.ticket.findUnique({
    where: { TicketId: Number(ticketId) },
    include: {
      client: true,
      order: true
    }
  });

  if (!ticket) {
    const error = new Error('Ticket no encontrado');
    error.statusCode = 404;
    throw error;
  }

  if (ticket.OrderId !== Number(orderId)) {
    const error = new Error('La orden no está relacionada con este ticket');
    error.statusCode = 400;
    throw error;
  }

  // Realizar modificaciones permitidas en transacción
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.serviceOrder.update({
      where: { OrderId: Number(orderId) },
      data: {
        ...modifications,
        // Registrar que fue modificado
        Notes: `${ticket.order.Notes || ''}\n[Modificado por ticket #${ticket.TicketNumber}]`
      }
    });

    // Registrar en historial de orden
    await tx.orderStatusHistory.create({
      data: {
        OrderId: order.OrderId,
        StatusId: order.CurrentStatusId,
        Notes: `Orden modificada mediante ticket de soporte #${ticket.TicketNumber}`,
        ChangedByUserId: adminUserId
      }
    });

    // Registrar en ticket
    await tx.ticketResponse.create({
      data: {
        TicketId: ticket.TicketId,
        Message: `Orden modificada exitosamente. Cambios aplicados: ${JSON.stringify(modifications)}`,
        RespondedByUserId: adminUserId,
        IsInternal: false
      }
    });

    // Actualizar estado del ticket
    await tx.ticket.update({
      where: { TicketId: ticket.TicketId },
      data: {
        Status: TICKET_STATUS.RESOLVED,
        ResolvedAt: new Date()
      }
    });

    return order;
  });

  console.log('[ORDER MODIFIED VIA TICKET]', {
    ticketId: ticket.TicketId,
    orderId,
    modifications,
    modifiedBy: adminUserId,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Orden modificada exitosamente mediante ticket',
    data: { order: result }
  });
});

/**
 * Cerrar ticket masivamente
 * Útil para limpieza de tickets antiguos
 */
export const bulkCloseTickets = asyncHandler(async (req, res) => {
  const { ticketIds, reason } = req.body;
  const userId = req.session?.userId || req.user?.id;

  if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
    const error = new Error('Debe proporcionar al menos un ticketId');
    error.statusCode = 400;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Actualizar tickets
    const updated = await tx.ticket.updateMany({
      where: {
        TicketId: { in: ticketIds.map(id => Number(id)) }
      },
      data: {
        Status: TICKET_STATUS.CLOSED,
        ClosedAt: new Date(),
        UpdatedAt: new Date()
      }
    });

    // Registrar respuesta en cada ticket
    for (const ticketId of ticketIds) {
      await tx.ticketResponse.create({
        data: {
          TicketId: Number(ticketId),
          Message: reason || 'Ticket cerrado masivamente',
          RespondedByUserId: userId,
          IsInternal: true
        }
      });
    }

    return updated;
  });

  console.log('[BULK TICKET CLOSURE]', {
    ticketIds,
    count: result.count,
    closedBy: userId,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: `${result.count} ticket(s) cerrado(s) exitosamente`,
    data: { closedCount: result.count }
  });
});

/**
 * Estadísticas de tickets
 */
export const getTicketStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};
  if (startDate || endDate) {
    where.CreatedAt = {};
    if (startDate) where.CreatedAt.gte = new Date(startDate);
    if (endDate) where.CreatedAt.lte = new Date(endDate);
  }

  const [
    totalTickets,
    byStatus,
    byPriority,
    byCategory,
    avgResolutionTime
  ] = await Promise.all([
    // Total de tickets
    prisma.ticket.count({ where }),

    // Por estado
    prisma.ticket.groupBy({
      by: ['Status'],
      where,
      _count: true
    }),

    // Por prioridad
    prisma.ticket.groupBy({
      by: ['Priority'],
      where,
      _count: true
    }),

    // Por categoría
    prisma.ticket.groupBy({
      by: ['CategoryId'],
      where,
      _count: true
    }),

    // Tiempo promedio de resolución
    prisma.ticket.aggregate({
      where: {
        ...where,
        Status: { in: [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED] },
        ResolvedAt: { not: null }
      },
      _avg: {
        // Calcular diferencia entre CreatedAt y ResolvedAt
        // Nota: Esto requiere una query raw o cálculo posterior
      }
    })
  ]);

  // Obtener nombres de categorías
  const categoryIds = byCategory.map(c => c.CategoryId);
  const categories = await prisma.ticketCategory.findMany({
    where: { CategoryId: { in: categoryIds } }
  });

  const categoriesWithCount = byCategory.map(c => {
    const cat = categories.find(cat => cat.CategoryId === c.CategoryId);
    return {
      categoryId: c.CategoryId,
      categoryName: cat?.Name || 'Desconocido',
      count: c._count
    };
  });

  res.json({
    success: true,
    data: {
      summary: {
        total: totalTickets,
        byStatus: byStatus.map(s => ({ status: s.Status, count: s._count })),
        byPriority: byPriority.map(p => ({ priority: p.Priority, count: p._count })),
        byCategory: categoriesWithCount
      }
    }
  });
});

/**
 * Listar categorías de tickets
 */
export const listTicketCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.ticketCategory.findMany({
    select: {
      CategoryId: true,
      Code: true,
      Name: true,
      Description: true
    },
    orderBy: { Name: 'asc' }
  });

  res.json({
    success: true,
    data: { categories }
  });
});