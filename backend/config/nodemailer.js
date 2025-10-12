// nodemailer.js
import nodemailer from "nodemailer";
import dotenv from 'dotenv';
dotenv.config();

function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // Use 'true' if your SMTP requires SSL/TLS on port 465, 'false' for STARTTLS on 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else if (process.env.ZIMBRA_HOST && process.env.ZIMBRA_USER) {
    return nodemailer.createTransport({
      host: process.env.ZIMBRA_HOST,
      port: Number(process.env.ZIMBRA_PORT) || 465,
      secure: true, // Zimbra usually uses SSL/TLS on port 465
      auth: {
        user: process.env.ZIMBRA_USER,
        pass: process.env.ZIMBRA_PASS
      }
    });
  } else {
    throw new Error('No hay configuración SMTP/Zimbra válida en variables de entorno');
  }
}

const transporter = getTransporter();

const COLORS = {
  primary: '#B2753B',
  background: '#FEFAF1',
  text: '#333333'
};

const baseStyle = `
  <style>
    body { margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: Arial, sans-serif; color: ${COLORS.text}; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px; }
    h2 { color: ${COLORS.primary}; text-align: center; }
    p { font-size: 16px; line-height: 1.5; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { display: inline-block; background-color: ${COLORS.primary}; color: #ffffff !important; padding: 14px 28px; border-radius: 5px; text-decoration: none; font-weight: bold; }
    .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .details-table th, .details-table td { border: 1px solid #e0e0e0; padding: 8px; text-align: left; }
    .details-table th { background-color: #f2f2f2; }
    .text-center { text-align: center; }
    hr { border: none; border-top: 1px solid #e0e0e0; margin: 30px 0; }
    footer { font-size: 12px; color: #888; text-align: center; }
  </style>
`;


// --- PLANTILLAS DE CORREO ---

/**
 * Envía las credenciales de recepcionista con diseño corporativo
 */
const sendMailToReceptionist = async (userMail, workId, tempPassword) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Soporte Ecuatechnology <no-reply@ecuatechnology.com>',
    to: userMail,
    subject: "Ecuatechnology - Credenciales de Recepcionista",
    html: `
      <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${baseStyle}</head><body>
      <div class="container">
        <h2>¡Bienvenida a Ecuatechnology!</h2>
        <p>Tu cuenta de recepcionista ha sido creada exitosamente.</p>
        <p><b>ID de trabajo:</b> ${workId}<br><b>Contraseña temporal:</b> ${tempPassword}</p>
        <p>Por favor, inicia sesión y cambia tu contraseña lo antes posible.</p>
        <hr>
        <footer>© ${new Date().getFullYear()} Ecuatechnology. Todos los derechos reservados.</footer>
      </div></body></html>`
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("Correo de credenciales enviado a:", userMail);
  } catch (error) {
    console.error("Error al enviar correo de credenciales:", error);
  }
};

/**
 * Envía un correo de OTP con diseño corporativo
 */
const sendOTPEmail = async (userMail, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Soporte Ecuatechnology <no-reply@ecuatechnology.com>',
    to: userMail,
    subject: 'Ecuatechnology - Código de verificación (OTP)',
    html: `
      <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${baseStyle}</head><body>
      <div class="container">
        <h2>Verificación de Seguridad</h2>
        <p>Para continuar con tu proceso, utiliza el siguiente código de verificación (OTP):</p>
        <div class="button-container">
          <span class="button" style="font-size: 2em; letter-spacing: 8px;">${otp}</span>
        </div>
        <p>Este código es válido por 10 minutos. Si no solicitaste este código, ignora este mensaje.</p>
        <hr>
        <footer>© ${new Date().getFullYear()} Ecuatechnology. Todos los derechos reservados.</footer>
      </div></body></html>`
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("Correo OTP enviado a:", userMail);
  } catch (error) {
    console.error("Error al enviar correo OTP:", error);
  }
};

/**
 * Envía correo cuando el admin cambia la contraseña de un usuario
 */
const sendPasswordChangedByAdmin = async (userMail, workId, newPassword) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Soporte Ecuatechnology <no-reply@ecuatechnology.com>',
    to: userMail,
    subject: 'Ecuatechnology - Tu contraseña ha sido restablecida',
    html: `
      <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${baseStyle}</head><body>
      <div class="container">
        <h2>Contraseña restablecida por el administrador</h2>
        <p>Tu contraseña ha sido restablecida por el administrador de IT.</p>
        <p><b>ID de trabajo:</b> ${workId}<br><b>Nueva contraseña:</b> ${newPassword}</p>
        <p>Por favor, inicia sesión y cambia tu contraseña lo antes posible.</p>
        <hr>
        <footer>© ${new Date().getFullYear()} Ecuatechnology. Todos los derechos reservados.</footer>
      </div></body></html>`
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("Correo de cambio de contraseña enviado a:", userMail);
  } catch (error) {
    console.error("Error al enviar correo de cambio de contraseña:", error);
  }
};

/**
 * Envía correo de solicitud de restablecimiento de contraseña (forgot password)
 */
const sendForgotPasswordRequest = async (adminMail, employeeId, employeeEmail) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Soporte Ecuatechnology <no-reply@ecuatechnology.com>',
    to: adminMail,
    subject: 'Ecuatechnology - Solicitud de restablecimiento de contraseña',
    html: `
      <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${baseStyle}</head><body>
      <div class="container">
        <h2>Solicitud de restablecimiento de contraseña</h2>
        <p>Se ha solicitado el restablecimiento de contraseña para el usuario:</p>
        <p><b>ID de empleado:</b> ${employeeId}<br><b>Email:</b> ${employeeEmail}</p>
        <p>Por favor, verifique la identidad del usuario antes de proceder.</p>
        <hr>
        <footer>© ${new Date().getFullYear()} Ecuatechnology. Todos los derechos reservados.</footer>
      </div></body></html>`
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("Correo de solicitud de forgot password enviado a:", adminMail);
  } catch (error) {
    console.error("Error al enviar correo de forgot password:", error);
  }
};

/**
 * Envía el correo de la proforma al cliente para su aprobación.
 */
const sendProformaEmail = async (clientMail, clientName, identityTag, parts, totalPrice) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Soporte Ecuatechnology <no-reply@ecuatechnology.com>',
    to: clientMail,
    subject: `Ecuatechnology - Proforma de Servicio para Orden ${identityTag}`,
    html: `
      <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${baseStyle}</head><body>
      <div class="container">
        <h2>Estimado/a ${clientName},</h2>
        <p>Hemos preparado la proforma para su orden de servicio con la etiqueta <b>${identityTag}</b>.</p>
        <p>A continuación, encontrará los detalles de los repuestos y el costo total estimado:</p>
        <table class="details-table">
          <thead>
            <tr>
              <th>Descripción de Repuestos/Servicios</th>
              <th>Precio Total Estimado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${parts || 'No especificado'}</td>
              <td>$${totalPrice ? totalPrice.toFixed(2) : 'N/A'}</td>
            </tr>
          </tbody>
        </table>
        <p>Para aprobar o rechazar esta proforma, por favor inicie sesión en nuestro portal de clientes o siga las instrucciones provistas por nuestro personal de ventas. Su aprobación es necesaria para que nuestros técnicos puedan proceder con el servicio.</p>
        <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
        <hr>
        <footer>© ${new Date().getFullYear()} Ecuatechnology. Todos los derechos reservados.</footer>
      </div></body></html>`
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("Correo de proforma enviado a:", clientMail);
  } catch (error) {
    console.error("Error al enviar correo de proforma:", error);
  }
};

/**
 * Envía el correo de confirmación al cliente después de aprobar/rechazar la proforma.
 */
const sendProformaConfirmationEmail = async (clientMail, clientName, identityTag, action) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Soporte Ecuatechnology <no-reply@ecuatechnology.com>',
    to: clientMail,
    subject: `Ecuatechnology - Confirmación de Proforma para Orden ${identityTag}`,
    html: `
      <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${baseStyle}</head><body>
      <div class="container">
        <h2>Estimado/a ${clientName},</h2>
        <p>Confirmamos que su proforma para la orden de servicio con la etiqueta <b>${identityTag}</b> ha sido <b>${action === 'approve' ? 'APROBADA' : 'RECHAZADA'}</b>.</p>
        ${action === 'approve'
          ? `<p>Nuestros técnicos procederán con el servicio de inmediato. Le notificaremos cuando su equipo esté listo para ser recogido o entregado.</p>`
          : `<p>Hemos tomado nota de su decisión. Si desea discutir esta decisión o explorar otras opciones, por favor contacte a nuestro equipo de ventas.</p>`
        }
        <p>Gracias por su confianza en Ecuatechnology.</p>
        <hr>
        <footer>© ${new Date().getFullYear()} Ecuatechnology. Todos los derechos reservados.</footer>
      </div></body></html>`
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Correo de confirmación de proforma (${action}) enviado a:`, clientMail);
  } catch (error) {
    console.error(`Error al enviar correo de confirmación de proforma (${action}):`, error);
  }
};

// Agregar al archivo nodemailer.js

/**
 * Envía correo de verificación de email para clientes
 */
const sendVerificationEmail = async (userMail, userName, verificationToken) => {
  const verificationUrl = `${process.env.CLIENT_APP_URL}/verify-email?token=${verificationToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Soporte Ecuatechnology <no-reply@ecuatechnology.com>',
    to: userMail,
    subject: 'Ecuatechnology - Verifica tu dirección de email',
    html: `
      <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${baseStyle}</head><body>
      <div class="container">
        <h2>Verifica tu dirección de email</h2>
        <p>Hola ${userName},</p>
        <p>Para completar tu registro en Ecuatechnology, por favor verifica tu dirección de email haciendo clic en el siguiente enlace:</p>
        <div class="button-container">
          <a href="${verificationUrl}" class="button">Verificar mi email</a>
        </div>
        <p>Si no puedes hacer clic en el botón, copia y pega la siguiente URL en tu navegador:</p>
        <p style="word-break: break-all; font-size: 12px; color: #666;">${verificationUrl}</p>
        <p>Este enlace expirará en 24 horas.</p>
        <hr>
        <footer>© ${new Date().getFullYear()} Ecuatechnology. Todos los derechos reservados.</footer>
      </div></body></html>`
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("Correo de verificación enviado a:", userMail);
  } catch (error) {
    console.error("Error al enviar correo de verificación:", error);
  }
};

/**
 * Envía correo de recuperación de contraseña para clientes
 */
const sendPasswordResetEmail = async (userMail, userName, resetToken) => {
  const resetUrl = `${process.env.CLIENT_APP_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Soporte Ecuatechnology <no-reply@ecuatechnology.com>',
    to: userMail,
    subject: 'Ecuatechnology - Restablecer tu contraseña',
    html: `
      <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${baseStyle}</head><body>
      <div class="container">
        <h2>Restablecer contraseña</h2>
        <p>Hola ${userName},</p>
        <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <div class="button-container">
          <a href="${resetUrl}" class="button">Restablecer contraseña</a>
        </div>
        <p>Si no puedes hacer clic en el botón, copia y pega la siguiente URL en tu navegador:</p>
        <p style="word-break: break-all; font-size: 12px; color: #666;">${resetUrl}</p>
        <p>Este enlace expirará en 1 hora. Si no solicitaste este restablecimiento, ignora este mensaje.</p>
        <hr>
        <footer>© ${new Date().getFullYear()} Ecuatechnology. Todos los derechos reservados.</footer>
      </div></body></html>`
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("Correo de recuperación de contraseña enviado a:", userMail);
  } catch (error) {
    console.error("Error al enviar correo de recuperación de contraseña:", error);
  }
};

// Agregar al export
export {
  sendMailToReceptionist,
  sendOTPEmail,
  sendPasswordChangedByAdmin,
  sendForgotPasswordRequest,
  sendProformaEmail,
  sendProformaConfirmationEmail,
  sendVerificationEmail,      // Nueva función
  sendPasswordResetEmail      // Nueva función
};