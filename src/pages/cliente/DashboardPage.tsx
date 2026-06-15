import { useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { LoanBadge } from '@/components/LoanBadge'
import { BookPlaceholder } from '@/components/BookPlaceholder'
import { usePrestamos } from '@/hooks/usePrestamos'
import { useAuthStore } from '@/store/authStore'
import { formatearFecha } from '@/lib/helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BookOpen } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { prestamos, loading, fetchMisPrestamos } = usePrestamos()

  useEffect(() => {
    if (user) fetchMisPrestamos(user.id)
  }, [user, fetchMisPrestamos])

  const activos = prestamos.filter((p) => p.estado === 'activo').length
  const retrasados = prestamos.filter((p) => p.estado === 'retrasado').length

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Mis préstamos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activos} activo{activos !== 1 ? 's' : ''}
            {retrasados > 0 && ` · ${retrasados} retrasado${retrasados !== 1 ? 's' : ''}`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : prestamos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">Sin préstamos</p>
            <p className="text-sm text-muted-foreground">Aún no tienes ningún préstamo registrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prestamos.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-4 p-4">
                    {/* Portada */}
                    <div className="flex-shrink-0">
                      {p.libro.image_url ? (
                        <img
                          src={p.libro.image_url}
                          alt={p.libro.title}
                          className="w-[72px] h-[100px] object-cover rounded shadow-sm"
                        />
                      ) : (
                        <BookPlaceholder className="w-[72px] h-[100px]" iconSize={24} />
                      )}
                    </div>

                    {/* Datos */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm leading-tight line-clamp-2">
                          {p.libro.title}
                        </h3>
                        <LoanBadge estado={p.estado} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{p.libro.author}</p>
                      {p.libro.year && (
                        <p className="text-xs text-muted-foreground">{p.libro.year}</p>
                      )}

                      <Separator className="my-1" />

                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Préstamo</span>
                          <span className="font-medium text-foreground">
                            {formatearFecha(p.fecha_prestamo)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Límite</span>
                          <span
                            className={`font-medium ${
                              p.estado === 'retrasado' ? 'text-destructive' : 'text-foreground'
                            }`}
                          >
                            {formatearFecha(p.fecha_devolucion)}
                          </span>
                        </div>
                        {p.fecha_devuelta && (
                          <div className="flex justify-between">
                            <span>Devuelto</span>
                            <span className="font-medium text-foreground">
                              {formatearFecha(p.fecha_devuelta)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
