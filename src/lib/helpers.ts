import { isAfter, parseISO } from 'date-fns'
import { EstadoPrestamo } from '@/types/database'

export function calcularEstado(
  fechaDevolucion: string,
  fechaDevuelta: string | null
): EstadoPrestamo {
  if (fechaDevuelta) return 'devuelto'
  const hoy = new Date()
  const limite = parseISO(fechaDevolucion)
  return isAfter(hoy, limite) ? 'retrasado' : 'activo'
}

export function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function fechaHoy(): string {
  return new Date().toISOString().split('T')[0]
}
