import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const { setUser, setLoading } = useAuthStore()

  const initialize = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const { data: profile } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setUser(profile)
    }

    setLoading(false)

    supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profile) setUser(profile)
      } else {
        setUser(null)
      }
    })
  }, [setUser, setLoading])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const { data: profile } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single()

    setUser(profile)

    if (profile?.rol === 'admin') {
      navigate('/admin/books')
    } else {
      navigate('/dashboard')
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/login')
  }

  return { initialize, login, logout }
}
