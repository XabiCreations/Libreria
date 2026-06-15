import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from '@/context/ToastContext'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'
import Login from '@/pages/auth/Login'
import RegisterPage from '@/pages/auth/RegisterPage'
import AdminLayout from '@/pages/admin/AdminLayout'
import BooksPage from '@/pages/admin/BooksPage'
import LoansPage from '@/pages/admin/LoansPage'
import UsersPage from '@/pages/admin/UsersPage'
import ClienteLayout from '@/pages/cliente/ClienteLayout'
import LibrosPage from '@/pages/cliente/LibrosPage'
import HistorialPage from '@/pages/cliente/HistorialPage'

function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode
  adminOnly?: boolean
}) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.rol !== 'admin') return <Navigate to="/dashboard" replace />

  return <>{children}</>
}

export default function App() {
  const { initialize } = useAuth()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/books" replace />} />
          <Route path="books" element={<BooksPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ClienteLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard/libros" replace />} />
          <Route path="libros" element={<LibrosPage />} />
          <Route path="historial" element={<HistorialPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ToastProvider>
  )
}
