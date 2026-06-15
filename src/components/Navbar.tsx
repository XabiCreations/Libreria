import { Link, useLocation } from 'react-router-dom'
import { BookOpen, ClipboardList, Users, LogOut, Library, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const adminLinks = [
  { to: '/admin/books', label: 'Libros', icon: BookOpen },
  { to: '/admin/loans', label: 'Préstamos', icon: ClipboardList },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
]

const clienteLinks = [
  { to: '/dashboard/libros', label: 'Libros', icon: BookOpen },
  { to: '/dashboard/historial', label: 'Historial', icon: History },
]

export function Navbar() {
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-primary">
            <Library className="h-5 w-5" />
            <span className="hidden sm:inline">Librería</span>
          </Link>

          {(user?.rol === 'admin' ? adminLinks : clienteLinks).length > 0 && (
            <nav className="hidden md:flex gap-1">
              {(user?.rol === 'admin' ? adminLinks : clienteLinks).map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    location.pathname.startsWith(to)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium">
              {user?.nombre} {user?.apellido}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{user?.rol}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {user && (
        <div className="md:hidden border-t bg-card">
          <div className="flex">
            {(user.rol === 'admin' ? adminLinks : clienteLinks).map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
                  location.pathname.startsWith(to)
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
