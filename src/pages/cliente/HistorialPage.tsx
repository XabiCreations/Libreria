import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { usePrestamos } from '@/hooks/usePrestamos'
import { fechaHoy } from '@/lib/helpers'
import { ActiveLoansSection } from '@/components/ActiveLoansSection'
import { LoanBadge } from '@/components/LoanBadge'
import { formatearFecha } from '@/lib/helpers'

export default function HistorialPage() {
  const { user } = useAuthStore()
  const { prestamos, loading, fetchMisPrestamos, actualizarPrestamo } = usePrestamos()

  useEffect(() => {
    if (user) fetchMisPrestamos(user.id)
  }, [fetchMisPrestamos, user])

  const devueltos = prestamos.filter((p) => p.estado === 'devuelto')

  return (
    <div className="space-y-8">
      <ActiveLoansSection
        prestamos={prestamos}
        loading={loading}
        onCancelar={async (prestamoId) => {
          const result = await actualizarPrestamo(prestamoId, { fecha_devuelta: fechaHoy() })
          if (!result.error && user) fetchMisPrestamos(user.id)
          return result
        }}
      />

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Historial</h1>
          <p className="text-sm text-muted-foreground">
            {devueltos.length} préstamo{devueltos.length !== 1 ? 's' : ''} devuelto{devueltos.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : devueltos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <p className="text-muted-foreground text-sm">Todavía no has devuelto ningún libro.</p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border overflow-hidden">
            {devueltos.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-4 bg-card hover:bg-muted/40 transition-colors">
                {p.libro.image_url ? (
                  <img
                    src={p.libro.image_url}
                    alt={p.libro.title}
                    className="h-16 w-11 object-cover rounded shrink-0"
                  />
                ) : (
                  <div className="h-16 w-11 bg-muted rounded shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.libro.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.libro.author}</p>
                </div>

                <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
                  <span>Prestado: <span className="text-foreground font-medium">{formatearFecha(p.fecha_prestamo)}</span></span>
                  <span>Devuelto: <span className="text-foreground font-medium">{formatearFecha(p.fecha_devuelta)}</span></span>
                </div>

                <div className="shrink-0">
                  <LoanBadge estado={p.estado} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
