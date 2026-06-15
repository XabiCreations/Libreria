import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Globe, Calendar, FileText, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLibros } from '@/hooks/useLibros'
import { usePrestamos } from '@/hooks/usePrestamos'
import { useToast } from '@/context/ToastContext'
import { Libro } from '@/types/database'
import { MAX_LIBROS_POR_USUARIO } from '@/lib/constants'
import { fechaHoy } from '@/lib/helpers'
import { ActiveLoansSection } from '@/components/ActiveLoansSection'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const reservaSchema = z
  .object({
    fecha_prestamo: z.string().min(1, ''),
    fecha_devolucion: z.string().min(1, ''),
  })
  .refine((d) => d.fecha_devolucion > d.fecha_prestamo, {
    message: 'Debe ser posterior al préstamo',
    path: ['fecha_devolucion'],
  })

type ReservaValues = z.infer<typeof reservaSchema>

export default function LibrosPage() {
  const { user } = useAuthStore()
  const { libros, loading: librosLoading, fetchLibros } = useLibros()
  const { prestamos, loading: prestamosLoading, fetchMisPrestamos, crearPrestamo, actualizarPrestamo } = usePrestamos()
  const { showToast } = useToast()

  const [librosOcupados, setLibrosOcupados] = useState<Set<string>>(new Set())
  const [reservaLibro, setReservaLibro] = useState<Libro | null>(null)
  const [saving, setSaving] = useState(false)
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<'todos' | 'disponible' | 'reservado'>('todos')
  const [busqueda, setBusqueda] = useState('')

  const form = useForm<ReservaValues>({
    resolver: zodResolver(reservaSchema),
    defaultValues: { fecha_prestamo: fechaHoy(), fecha_devolucion: '' },
  })

  const cargarOcupados = useCallback(async () => {
    const { data } = await supabase.rpc('get_libros_ocupados')
    if (data) setLibrosOcupados(new Set(data.map((p: { libro_id: string }) => p.libro_id)))
  }, [])

  useEffect(() => {
    fetchLibros()
    cargarOcupados()
    if (user) fetchMisPrestamos(user.id)
  }, [fetchLibros, cargarOcupados, fetchMisPrestamos, user])

  const activos = prestamos.filter(
    (p) => p.estado === 'activo' || p.estado === 'retrasado'
  )
  const limitAlcanzado = activos.length >= MAX_LIBROS_POR_USUARIO

  const openReserva = (libro: Libro) => {
    form.reset({ fecha_prestamo: fechaHoy(), fecha_devolucion: '' })
    setReservaLibro(libro)
  }

  const onSubmit = async (values: ReservaValues) => {
    if (!user || !reservaLibro) return
    setSaving(true)
    const { error } = await crearPrestamo({
      usuario_id: user.id,
      libro_id: reservaLibro.id,
      fecha_prestamo: values.fecha_prestamo,
      fecha_devolucion: values.fecha_devolucion,
    })
    setSaving(false)
    if (error) {
      showToast({ variant: 'error', message: 'No se pudo reservar el libro' })
    } else {
      showToast({ variant: 'success', message: 'Libro reservado correctamente' })
      setReservaLibro(null)
      if (user) fetchMisPrestamos(user.id)
      cargarOcupados()
    }
  }

  return (
    <div className="space-y-8">
      <ActiveLoansSection
        prestamos={prestamos}
        loading={prestamosLoading}
        onCancelar={async (prestamoId) => {
          const result = await actualizarPrestamo(prestamoId, { fecha_devuelta: fechaHoy() })
          if (!result.error) {
            if (user) fetchMisPrestamos(user.id)
            cargarOcupados()
          }
          return result
        }}
      />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Catálogo</h1>
            <p className="text-sm text-muted-foreground">{libros.length} libros</p>
          </div>
          {limitAlcanzado && (
            <p className="text-sm font-medium text-destructive">
              Has alcanzado el límite de {MAX_LIBROS_POR_USUARIO} préstamos activos
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {(['todos', 'disponible', 'reservado'] as const).map((opcion) => (
              <button
                key={opcion}
                onClick={() => setFiltroDisponibilidad(opcion)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filtroDisponibilidad === opcion
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {opcion === 'todos' ? 'Todos' : opcion === 'disponible' ? 'Disponibles' : 'Reservados'}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-1/4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar libro, autor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {librosLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {libros.filter((libro) => {
              const ocupado = librosOcupados.has(libro.id)
              if (filtroDisponibilidad === 'disponible' && ocupado) return false
              if (filtroDisponibilidad === 'reservado' && !ocupado) return false
              if (busqueda) {
                const q = busqueda.toLowerCase()
                return libro.title.toLowerCase().includes(q) || libro.author.toLowerCase().includes(q)
              }
              return true
            }).sort((a, b) => {
              const aOcupado = librosOcupados.has(a.id) ? 1 : 0
              const bOcupado = librosOcupados.has(b.id) ? 1 : 0
              return aOcupado - bOcupado
            }).map((libro) => {
              const ocupado = librosOcupados.has(libro.id)
              const deshabilitado = ocupado || limitAlcanzado
              return (
                <Card key={libro.id} className="overflow-hidden flex flex-col">
                  {libro.image_url ? (
                    <img
                      src={libro.image_url}
                      alt={libro.title}
                      className="w-full h-[200px] object-cover"
                    />
                  ) : (
                    <div className="w-full h-[200px] bg-muted" />
                  )}

                  <CardContent className="p-4 flex flex-col gap-2 flex-1">
                    <div className="space-y-2 flex-1">
                      <p className="font-semibold text-lg leading-snug">{libro.title}</p>
                      <p className="text-base italic text-muted-foreground">{libro.author}</p>
                      <hr className="border-border" />
                      {libro.language && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">{libro.language}</span>
                        </div>
                      )}
                      {libro.year && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">{libro.year}</span>
                        </div>
                      )}
                      {libro.pages && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">{libro.pages} páginas</span>
                        </div>
                      )}
                    </div>

                    <Button
                      className="w-full mt-2"
                      variant={deshabilitado ? 'outline' : 'default'}
                      disabled={deshabilitado}
                      onClick={() => openReserva(libro)}
                    >
                      {ocupado ? 'No disponible' : limitAlcanzado ? 'Límite alcanzado' : 'Reservar libro'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Diálogo de reserva */}
      <Dialog open={!!reservaLibro} onOpenChange={(o) => { if (!o) setReservaLibro(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reservar libro</DialogTitle>
          </DialogHeader>

          {reservaLibro && (
            <div className="flex items-center gap-3 pb-3 border-b">
              {reservaLibro.image_url ? (
                <img
                  src={reservaLibro.image_url}
                  alt=""
                  className="h-16 w-11 object-cover rounded shrink-0"
                />
              ) : (
                <div className="h-16 w-11 bg-muted rounded shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{reservaLibro.title}</p>
                <p className="text-xs text-muted-foreground truncate">{reservaLibro.author}</p>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="fecha_prestamo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha préstamo *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fecha_devolucion" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha límite *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReservaLibro(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Reservando...' : 'Confirmar reserva'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
