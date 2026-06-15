import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Libro, NuevoLibro } from '@/types/database'

export function useLibros() {
  const [libros, setLibros] = useState<Libro[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLibros = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .order('title')
    if (!error && data) setLibros(data)
    setLoading(false)
    return { data, error }
  }, [])

  const crearLibro = async (libro: NuevoLibro) => {
    const { data, error } = await supabase
      .from('libros')
      .insert(libro)
      .select()
      .single()
    if (!error && data) setLibros((prev) => [...prev, data])
    return { data, error }
  }

  const actualizarLibro = async (id: string, libro: Partial<NuevoLibro>) => {
    const { data, error } = await supabase
      .from('libros')
      .update(libro)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setLibros((prev) => prev.map((l) => (l.id === id ? data : l)))
    }
    return { data, error }
  }

  const eliminarLibro = async (id: string) => {
    // Verificar préstamos activos antes de borrar
    const { data: prestamos } = await supabase
      .from('prestamos')
      .select('id, fecha_devolucion, fecha_devuelta')
      .eq('libro_id', id)

    const tieneActivos = prestamos?.some(
      (p) => !p.fecha_devuelta && new Date(p.fecha_devolucion) >= new Date()
    )

    if (tieneActivos) {
      return { error: { message: 'Este libro tiene préstamos activos y no puede eliminarse.' } }
    }

    const { data: deleted, error } = await supabase.from('libros').delete().eq('id', id).select('id')
    if (error) return { error }
    if (!deleted || deleted.length === 0) {
      return { error: { message: 'No tienes permiso para eliminar este libro. Verifica que tu cuenta tiene rol de administrador.' } }
    }
    setLibros((prev) => prev.filter((l) => l.id !== id))
    return { error: null }
  }

  const restaurarLibro = async (libro: Libro) => {
    const { data, error } = await supabase
      .from('libros')
      .upsert(libro)
      .select()
      .single()
    if (!error && data) setLibros((prev) => [...prev, data])
    return { data, error }
  }

  return { libros, loading, fetchLibros, crearLibro, actualizarLibro, eliminarLibro, restaurarLibro }
}
