import validator from 'validator';

export function validateEmail(email) {
  return validator.isEmail(email);
}

export function validatePassword(password) {
  // Al menos 8 caracteres, una mayúscula, una minúscula, un número
  return validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0
  });
}

export function sanitizeInput(input) {
  return validator.escape(input);
}
