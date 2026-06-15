import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Prestamo, PrestamoConDetalles, NuevoPrestamo } from '@/types/database'
import { calcularEstado } from '@/lib/helpers'
import { MAX_LIBROS_POR_USUARIO } from '@/lib/constants'

function enriquecer(p: Prestamo & { usuario: unknown; libro: unknown }): PrestamoConDetalles {
  return {
    ...p,
    estado: calcularEstado(p.fecha_devolucion, p.fecha_devuelta),
    usuario: p.usuario as PrestamoConDetalles['usuario'],
    libro: p.libro as PrestamoConDetalles['libro'],
  }
}

export function usePrestamos() {
  const [prestamos, setPrestamos] = useState<PrestamoConDetalles[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPrestamos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('prestamos')
      .select(`*, usuario:usuarios(*), libro:libros(*)`)
      .order('created_at', { ascending: false })
    if (!error && data) setPrestamos(data.map(enriquecer))
    setLoading(false)
    return { data, error }
  }, [])

  const fetchMisPrestamos = useCallback(async (usuarioId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('prestamos')
      .select(`*, usuario:usuarios(*), libro:libros(*)`)
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })
    if (!error && data) setPrestamos(data.map(enriquecer))
    setLoading(false)
    return { data, error }
  }, [])

  const crearPrestamo = async (nuevo: NuevoPrestamo) => {
    // Validar: libro no prestado actualmente
    const { data: prestamosLibro } = await supabase
      .from('prestamos')
      .select('id, fecha_devolucion, fecha_devuelta')
      .eq('libro_id', nuevo.libro_id)

    const libroActivo = prestamosLibro?.some(
      (p) => !p.fecha_devuelta && new Date(p.fecha_devolucion) >= new Date()
    )
    if (libroActivo) {
      return { error: { message: 'Este libro ya está prestado.' } }
    }

    // Validar: usuario no supera 5 libros activos
    const { data: prestamosUsuario } = await supabase
      .from('prestamos')
      .select('id, fecha_devolucion, fecha_devuelta')
      .eq('usuario_id', nuevo.usuario_id)

    const activosUsuario = prestamosUsuario?.filter(
      (p) => !p.fecha_devuelta && new Date(p.fecha_devolucion) >= new Date()
    ).length ?? 0

    if (activosUsuario >= MAX_LIBROS_POR_USUARIO) {
      return { error: { message: `Este usuario ha alcanzado el límite de ${MAX_LIBROS_POR_USUARIO} libros prestados.` } }
    }

    const { data, error } = await supabase
      .from('prestamos')
      .insert(nuevo)
      .select(`*, usuario:usuarios(*), libro:libros(*)`)
      .single()

    if (!error && data) setPrestamos((prev) => [enriquecer(data), ...prev])
    return { data, error }
  }

  const actualizarPrestamo = async (id: string, cambios: Partial<Prestamo>) => {
    const { data, error } = await supabase
      .from('prestamos')
      .update(cambios)
      .eq('id', id)
      .select(`*, usuario:usuarios(*), libro:libros(*)`)
      .single()

    if (!error && data) {
      setPrestamos((prev) => prev.map((p) => (p.id === id ? enriquecer(data) : p)))
    }
    return { data, error }
  }

  const eliminarPrestamo = async (id: string) => {
    const { error } = await supabase.from('prestamos').delete().eq('id', id)
    if (!error) setPrestamos((prev) => prev.filter((p) => p.id !== id))
    return { error }
  }

  return {
    prestamos,
    loading,
    fetchPrestamos,
    fetchMisPrestamos,
    crearPrestamo,
    actualizarPrestamo,
    eliminarPrestamo,
  }
}
