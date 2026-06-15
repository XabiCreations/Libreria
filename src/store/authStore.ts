import { create } from 'zustand'
import { Usuario } from '@/types/database'

interface AuthState {
  user: Usuario | null
  loading: boolean
  setUser: (user: Usuario | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}))
