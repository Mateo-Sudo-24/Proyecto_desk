import { z } from 'zod';
import validator from 'validator';

// --- FUNCIONES DE VALIDACIÓN PERSONALIZADA CON VALIDATOR.JS ---

/**
 * Valida y sanitiza email usando validator.js
 */
export function validateAndSanitizeEmail(email) {
  if (!email) return { isValid: false, sanitized: '' };
  
  const trimmed = email.trim();
  return {
    isValid: validator.isEmail(trimmed),
    sanitized: validator.normalizeEmail(trimmed)
  };
}

/**
 * Valida contraseña fuerte
 */
export function validateStrongPassword(password) {
  return validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0
  });
}

/**
 * Sanitiza texto para prevenir XSS
 */
export function sanitizeText(input) {
  if (!input) return '';
  return validator.escape(input.trim());
}

/**
 * Valida número de teléfono (formato internacional)
 */
export function validatePhone(phone) {
  if (!phone) return false;
  // Acepta formatos: +593987654321, 0987654321, etc.
  return validator.isMobilePhone(phone, 'any', { strictMode: false });
}

/**
 * Valida número de identificación (cédula ecuatoriana)
 */
export function validateEcuadorianId(idNumber) {
  if (!idNumber || idNumber.length !== 10) return false;
  
  // Algoritmo de validación de cédula ecuatoriana
  const digits = idNumber.split('').map(Number);
  const provinceCode = parseInt(idNumber.substr(0, 2));
  
  if (provinceCode < 1 || provinceCode > 24) return false;
  
  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    let value = digits[i] * coefficients[i];
    if (value > 9) value -= 9;
    sum += value;
  }
  
  const checkDigit = sum % 10 === 0 ? 0 : 10 - (sum % 10);
  return checkDigit === digits[9];
}

// --- REFINAMIENTOS ZOD PERSONALIZADOS ---

/**
 * Refinamiento Zod para email con validator.js
 */
const emailRefinement = z.string()
  .min(1, 'El email es requerido')
  .refine((email) => {
    const { isValid } = validateAndSanitizeEmail(email);
    return isValid;
  }, 'Email inválido')
  .transform((email) => {
    const { sanitized } = validateAndSanitizeEmail(email);
    return sanitized;
  });

/**
 * Refinamiento Zod para contraseña fuerte
 */
const strongPasswordRefinement = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine(
    (password) => validateStrongPassword(password),
    'La contraseña debe contener al menos: 8 caracteres, 1 mayúscula, 1 minúscula y 1 número'
  );

/**
 * Refinamiento Zod para texto sanitizado
 */
const sanitizedString = (minLength = 1, maxLength = 255) => 
  z.string()
    .min(minLength)
    .max(maxLength)
    .transform(sanitizeText);

/**
 * Refinamiento Zod para teléfono
 */
const phoneRefinement = z.string()
  .refine(
    (phone) => validatePhone(phone),
    'Número de teléfono inválido'
  );

/**
 * Refinamiento Zod para cédula ecuatoriana
 */
const ecuadorianIdRefinement = z.string()
  .length(10, 'La cédula debe tener 10 dígitos')
  .refine(
    (id) => validateEcuadorianId(id),
    'Número de cédula inválido'
  );

// --- MIDDLEWARE DE VALIDACIÓN ---

/**
 * Middleware genérico de validación con Zod
 * @param {z.ZodSchema} schema - Schema de validación
 * @param {string} source - Origen de los datos (body, query, params)
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      // Parsea y valida los datos
      const parsed = schema.parse(req[source]);
      
      // Reemplaza los datos originales con los validados y sanitizados
      req[source] = parsed;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
};

// --- SCHEMAS DE VALIDACIÓN PARA EL SISTEMA ---

export const schemas = {
  // AUTENTICACIÓN
  login: z.object({
    workId: sanitizedString(3, 50),
    password: z.string().min(1, 'La contraseña es requerida')
  }),

  changePassword: z.object({
    oldPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: strongPasswordRefinement
  }),

  forgotPassword: z.object({
    workId: sanitizedString(3, 50)
  }),

  // CLIENTE
  createClient: z.object({
    clientTypeId: z.number().int().positive('El tipo de cliente debe ser un número positivo'),
    displayName: sanitizedString(1, 255),
    idNumber: ecuadorianIdRefinement.optional(),
    email: emailRefinement.optional(),
    phone: phoneRefinement.optional(),
    address: sanitizedString(1, 500).optional(),
    contactName: sanitizedString(1, 255).optional(),
    isPublicService: z.boolean().default(false),
    organizationName: sanitizedString(1, 255).optional(),
    deliveryAddress: sanitizedString(1, 500).optional()
  }).refine(
    (data) => {
      // Si es servicio público, requiere organizationName
      if (data.isPublicService && !data.organizationName) {
        return false;
      }
      return true;
    },
    {
      message: 'Los servicios públicos requieren nombre de organización',
      path: ['organizationName']
    }
  ),

  updateClient: z.object({
    clientId: z.number().int().positive(),
    clientTypeId: z.number().int().positive(),
    displayName: sanitizedString(1, 255),
    idNumber: ecuadorianIdRefinement.optional(),
    email: emailRefinement.optional(),
    phone: phoneRefinement.optional(),
    address: sanitizedString(1, 500).optional(),
    contactName: sanitizedString(1, 255).optional(),
    isPublicService: z.boolean().optional(),
    organizationName: sanitizedString(1, 255).optional(),
    deliveryAddress: sanitizedString(1, 500).optional()
  }),

  // EQUIPO
  registerEquipment: z.object({
    clientId: z.number().int().positive(),
    equipmentTypeId: z.number().int().positive(),
    brand: sanitizedString(1, 100),
    model: sanitizedString(1, 100),
    serialNumber: sanitizedString(1, 100).optional(),
    description: sanitizedString(1, 1000).optional()
  }),

  // ORDEN DE SERVICIO
  createOrder: z.object({
    clientId: z.number().int().positive(),
    equipmentId: z.number().int().positive(),
    notes: sanitizedString(0, 2000).optional(),
    estimatedDeliveryDate: z.string().datetime().optional().or(z.date().optional()),
    technicianId: z.number().int().positive().optional()
  }),

  registerEquipmentExit: z.object({
    orderId: z.number().int().positive(),
    notes: sanitizedString(0, 1000).optional(),
    receivedByClientName: sanitizedString(1, 255)
  }),

  // TÉCNICO
  setDiagnosis: z.object({
    orderId: z.number().int().positive(),
    diagnosis: sanitizedString(10, 5000)
  }),

  startService: z.object({
    orderId: z.number().int().positive()
  }),

  endService: z.object({
    orderId: z.number().int().positive(),
    finalNotes: sanitizedString(0, 2000).optional()
  }),

  // VENTAS
  generateProforma: z.object({
    orderId: z.number().int().positive(),
    parts: z.string().min(1, 'Los repuestos son requeridos'),
    totalPrice: z.number().positive('El precio debe ser mayor a 0').or(
      z.string().transform((val) => {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) {
          throw new Error('Precio inválido');
        }
        return num;
      })
    )
  }),

  sendProforma: z.object({
    orderId: z.number().int().positive()
  }),

  // QUERY PARAMS
  listOrdersQuery: z.object({
    status: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    clientId: z.string().optional().transform((val) => val ? parseInt(val) : undefined),
    page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
    limit: z.string().optional().transform((val) => val ? parseInt(val) : 50)
  })
};

// --- FUNCIONES AUXILIARES PÚBLICAS ---

/**
 * Valida un objeto completo contra un schema
 * Útil para validaciones fuera de middleware
 */
export function validateData(schema, data) {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    throw error;
  }
}

/**
 * Sanitiza un objeto completo recursivamente
 */
export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeText(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
}

// --- MIDDLEWARE DE SANITIZACIÓN GLOBAL ---

/**
 * Middleware que sanitiza automáticamente body, query y params
 * Aplicar ANTES de otros middlewares
 */
export const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};