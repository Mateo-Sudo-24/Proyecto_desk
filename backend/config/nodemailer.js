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

import nodemailer from "nodemailer";
import dotenv from 'dotenv';
dotenv.config();


function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else if (process.env.ZIMBRA_HOST && process.env.ZIMBRA_USER) {
    return nodemailer.createTransport({
      host: process.env.ZIMBRA_HOST,
      port: Number(process.env.ZIMBRA_PORT) || 465,
      secure: true,
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


export {
  sendMailToReceptionist,
  sendOTPEmail,
  sendPasswordChangedByAdmin,
  sendForgotPasswordRequest
};
