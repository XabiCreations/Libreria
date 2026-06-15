import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Usuario, NuevoUsuario, EditarUsuario } from '@/types/database'

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

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const crearUsuario = async (nuevo: NuevoUsuario) => {
    const token = await getToken()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(nuevo),
    })
    const result = await res.json()
    if (!res.ok) return { error: { message: result.error } }
    await fetchUsuarios()
    return { data: result.user, error: null }
  }

  const editarUsuario = async (userId: string, datos: EditarUsuario) => {
    const token = await getToken()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, ...datos }),
    })
    const result = await res.json()
    if (!res.ok) return { data: null, error: { message: result.error } }
    setUsuarios((prev) => prev.map((u) => (u.id === userId ? { ...u, ...result.user } : u)))
    return { data: result.user, error: null }
  }

  const eliminarUsuario = async (userId: string) => {
    const token = await getToken()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId }),
    })
    const result = await res.json()
    if (!res.ok) return { error: { message: result.error } }
    setUsuarios((prev) => prev.filter((u) => u.id !== userId))
    return { error: null }
  }

  return { usuarios, loading, fetchUsuarios, crearUsuario, editarUsuario, eliminarUsuario }
}
