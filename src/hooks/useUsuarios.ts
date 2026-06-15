import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Usuario, NuevoUsuario } from '@/types/database'

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('apellido')
    if (!error && data) setUsuarios(data)
    setLoading(false)
    return { data, error }
  }, [])

  const crearUsuario = async (nuevo: NuevoUsuario) => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(nuevo),
    })

    const result = await res.json()
    if (!res.ok) return { error: { message: result.error } }

    await fetchUsuarios()
    return { data: result.user, error: null }
  }

  return { usuarios, loading, fetchUsuarios, crearUsuario }
}
