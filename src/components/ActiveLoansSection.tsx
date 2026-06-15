import { PrestamoConDetalles } from '@/types/database'
import { LoanBadge } from '@/components/LoanBadge'
import { BookPlaceholder } from '@/components/BookPlaceholder'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'
import { formatearFecha } from '@/lib/helpers'

interface Props {
  prestamos: PrestamoConDetalles[]
  loading: boolean
  onCancelar?: (prestamoId: string) => Promise<{ error: unknown }>
}

export function ActiveLoansSection({ prestamos, loading, onCancelar }: Props) {
  const { showToast } = useToast()

  const activos = prestamos.filter(
    (p) => p.estado === 'activo' || p.estado === 'retrasado'
  )

  if (!loading && activos.length === 0) return null

  const handleCancelar = (p: PrestamoConDetalles) => {
    if (!onCancelar) return
    showToast({
      variant: 'destructive',
      message: `¿Cancelar el préstamo de "${p.libro.title}"?`,
      onConfirm: async () => {
        const { error } = await onCancelar(p.id)
        showToast(
          error
            ? { variant: 'error', message: 'No se pudo cancelar el préstamo' }
            : { variant: 'success', message: 'Préstamo cancelado correctamente' }
        )
      },
    })
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Préstamos activos</h2>
      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 w-full rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {activos.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card overflow-hidden">
              {/* Parte superior: portada + título/autor + botón cancelar */}
              <div className="flex gap-4 p-4">
                {p.libro.image_url ? (
                  <img
                    src={p.libro.image_url}
                    alt={p.libro.title}
                    className="h-20 w-14 object-cover rounded shrink-0"
                  />
                ) : (
                  <BookPlaceholder className="h-20 w-14 shrink-0" iconSize={16} />
                )}
                <div className="flex flex-1 min-w-0 flex-col justify-between gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-xl leading-tight line-clamp-2">
                        {p.libro.title}
                      </p>
                      <p className="text-base italic text-muted-foreground truncate mt-1">
                        {p.libro.author}
                      </p>
                    </div>
                    {onCancelar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancelar(p)}
                      >
                        Cancelar préstamo
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Separador */}
              <div className="mx-4 border-t border-border" />

              {/* Parte inferior: línea de fechas con estado en el centro */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="text-center shrink-0">
                  <p className="text-xs text-muted-foreground">Inicio</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatearFecha(p.fecha_prestamo)}
                  </p>
                </div>

                <div className="flex flex-1 items-center gap-2">
                  <div className="flex-1 border-t border-muted-foreground/30" />
                  <LoanBadge estado={p.estado} />
                  <div className="flex-1 border-t border-muted-foreground/30" />
                </div>

                <div className="text-center shrink-0">
                  <p className="text-xs text-muted-foreground">Límite</p>
                  <p className={`text-sm font-semibold tabular-nums ${p.estado === 'retrasado' ? 'text-destructive' : ''}`}>
                    {formatearFecha(p.fecha_devolucion)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
