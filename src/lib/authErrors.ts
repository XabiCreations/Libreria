const ERROR_MAP: Record<string, string> = {
  'User already registered': 'Este email ya está registrado. Si crees que es un error, contacta con el administrador.',
  'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
  'Signup is disabled': 'El registro no está disponible en este momento. Contacta con el administrador.',
  'Invalid email': 'El email introducido no es válido.',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
  'Email link is invalid or has expired': 'El enlace ha expirado. Solicita uno nuevo.',
  'Token has expired or is invalid': 'El código ha expirado o no es válido.',
}

export function traducirErrorAuth(message: string): string {
  return ERROR_MAP[message] ?? 'Ha ocurrido un error. Inténtalo de nuevo.'
}
