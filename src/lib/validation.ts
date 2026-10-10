const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Ingresa tu correo electrónico';
  if (!EMAIL_REGEX.test(value)) return 'Correo electrónico no válido';
  return null;
}

export function validarPassword(password: string): string | null {
  if (!password) return 'Ingresa tu contraseña';
  if (password.length < 8) return 'Debe tener al menos 8 caracteres';
  return null;
}

export function validarPasswordConfirmacion(password: string, confirmacion: string): string | null {
  const base = validarPassword(password);
  if (base) return base;
  if (password !== confirmacion) return 'Las contraseñas no coinciden';
  return null;
}

export function validarNombre(nombre: string): string | null {
  const value = nombre.trim();
  if (!value) return 'Ingresa tu nombre';
  if (value.length < 2) return 'Mínimo 2 caracteres';
  if (value.length > 120) return 'Máximo 120 caracteres';
  return null;
}

export function validarTelefono(telefono: string): string | null {
  const digitos = soloDigitos(telefono);
  if (!digitos) return 'Ingresa tu teléfono';
  if (digitos.length !== 10) return 'Debe tener 10 dígitos';
  return null;
}

export function soloDigitos(valor: string, max = 10): string {
  return valor.replace(/\D/g, '').slice(0, max);
}

export function mensajeErrorAuth(codigo: string | undefined, mensaje: string): string {
  switch (codigo) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos';
    case 'email_not_confirmed':
      return 'Confirma tu correo electrónico para continuar';
    case 'email_exists':
      return 'Ese correo ya está registrado';
    case 'weak_password':
      return 'La contraseña es muy débil, usa 8+ caracteres';
    case 'over_email_send_rate_limit':
    case 'too_many_requests':
      return 'Demasiados intentos, espera unos minutos';
    case 'signup_disabled':
      return 'El registro está deshabilitado temporalmente';
    default:
      return mensaje || 'Ocurrió un error, intenta de nuevo';
  }
}
