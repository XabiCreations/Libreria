import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type SortingState,
} from '@tanstack/react-table'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { usePrestamos } from '@/hooks/usePrestamos'
import { useUsuarios } from '@/hooks/useUsuarios'
import { useLibros } from '@/hooks/useLibros'
import { useToast } from '@/context/ToastContext'
import { PrestamoConDetalles, EstadoPrestamo, Usuario, Libro } from '@/types/database'
import { formatearFecha, fechaHoy } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoanBadge } from '@/components/LoanBadge'
import { cn } from '@/lib/utils'

const createSchema = z
  .object({
    usuario_id: z.string().min(1, 'Selecciona un usuario'),
    libro_id: z.string().min(1, 'Selecciona un libro'),
    fecha_prestamo: z.string().min(1, ''),
    fecha_devolucion: z.string().min(1, ''),
  })
  .refine((d) => d.fecha_devolucion > d.fecha_prestamo, {
    message: 'Debe ser posterior al préstamo',
    path: ['fecha_devolucion'],
  })

const editSchema = z.object({
  fecha_prestamo: z.string().min(1, ''),
  fecha_devolucion: z.string().min(1, ''),
  fecha_devuelta: z.string().optional(),
  marcarDevuelto: z.boolean().optional(),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>

type EstadoFilter = 'todos' | EstadoPrestamo

// ─── SearchCombobox ──────────────────────────────────────────
function SearchCombobox<T extends { id: string }>({
  items,
  value,
  onChange,
  getLabel,
  filterFn,
  renderRow,
  placeholder = 'Buscar...',
  emptyMessage = 'No se encontraron resultados',
}: {
  items: T[]
  value: string
  onChange: (id: string) => void
  getLabel: (item: T) => string
  filterFn: (item: T, query: string) => boolean
  renderRow: (item: T, highlighted: boolean) => React.ReactNode
  placeholder?: string
  emptyMessage?: string
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedItem = items.find((i) => i.id === value) ?? null

  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredItems = query ? items.filter((i) => filterFn(i, query)) : items

  const handleFocus = () => {
    setQuery(selectedItem ? getLabel(selectedItem) : '')
    setHighlightedIndex(0)
    setIsOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setHighlightedIndex(0)
    if (!isOpen) setIsOpen(true)
    if (!val) onChange('')
  }

  const handleSelect = (item: T) => {
    onChange(item.id)
    setQuery('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') { setIsOpen(true); return }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((i) => Math.min(i + 1, filteredItems.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredItems[highlightedIndex]) handleSelect(filteredItems[highlightedIndex])
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const inputDisplayValue = isOpen ? query : (selectedItem ? getLabel(selectedItem) : '')

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={inputDisplayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md overflow-y-auto max-h-56">
          {filteredItems.length === 0 ? (
            <p className="px-3 py-4 text-sm text-center text-muted-foreground">{emptyMessage}</p>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id}
                className={cn('cursor-pointer', idx === highlightedIndex && 'bg-accent')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                {renderRow(item, idx === highlightedIndex)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function SortableHeader({ column, label }: { column: Column<any, unknown>; label: string }) {
  return (
    <button
      className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {label}
      {column.getIsSorted() === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : column.getIsSorted() === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  )
}

const col = createColumnHelper<PrestamoConDetalles>()

export default function LoansPage() {
  const { prestamos, loading, fetchPrestamos, crearPrestamo, actualizarPrestamo, eliminarPrestamo } = usePrestamos()
  const { usuarios, fetchUsuarios } = useUsuarios()
  const { libros, fetchLibros } = useLibros()
  const { showToast } = useToast()

  const [globalFilter, setGlobalFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('todos')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PrestamoConDetalles | null>(null)
  const [saving, setSaving] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { fecha_prestamo: fechaHoy(), fecha_devolucion: '' },
  })

  const editForm = useForm<EditValues>({ resolver: zodResolver(editSchema) })

  const selectedUsuarioId = createForm.watch('usuario_id')
  const MAX_PRESTAMOS = 5
  const activeLoansCount = useMemo(() =>
    selectedUsuarioId
      ? prestamos.filter((p) => p.usuario_id === selectedUsuarioId && (p.estado === 'activo' || p.estado === 'retrasado')).length
      : 0,
    [selectedUsuarioId, prestamos]
  )
  const quotaRestante = MAX_PRESTAMOS - activeLoansCount

  useEffect(() => {
    fetchPrestamos()
    fetchUsuarios()
    fetchLibros()
  }, [fetchPrestamos, fetchUsuarios, fetchLibros])

  // Sin useMemo, filtered crea una nueva referencia en cada render. useReactTable detecta
  // el cambio de referencia en `data` y llama a resetPageIndex(), que genera un nuevo objeto
  // de estado de paginación → re-render → nuevo array → reset → bucle infinito que bloquea
  // la página. useMemo estabiliza la referencia y corta el ciclo.
  const filtered = useMemo(() => prestamos.filter((p) => {
    if (estadoFilter !== 'todos' && p.estado !== estadoFilter) return false
    const q = globalFilter.toLowerCase()
    if (!q) return true
    return (
      `${p.usuario.nombre} ${p.usuario.apellido}`.toLowerCase().includes(q) ||
      p.usuario.dni.toLowerCase().includes(q)
    )
  }), [prestamos, estadoFilter, globalFilter])

  const onCreateSubmit = async (values: CreateValues) => {
    setSaving(true)
    const { error } = await crearPrestamo(values)
    setSaving(false)
    if (error) {
      showToast({ variant: 'error', message: error.message })
    } else {
      showToast({ variant: 'success', message: 'Préstamo creado' })
      setCreateOpen(false)
      createForm.reset()
    }
  }

  const openEdit = (p: PrestamoConDetalles) => {
    editForm.reset({
      fecha_prestamo: p.fecha_prestamo,
      fecha_devolucion: p.fecha_devolucion,
      fecha_devuelta: p.fecha_devuelta ?? '',
      marcarDevuelto: !!p.fecha_devuelta,
    })
    setEditTarget(p)
  }

  const onEditSubmit = async (values: EditValues) => {
    if (!editTarget) return
    setSaving(true)
    const { error } = await actualizarPrestamo(editTarget.id, {
      fecha_prestamo: values.fecha_prestamo,
      fecha_devolucion: values.fecha_devolucion,
      fecha_devuelta: values.marcarDevuelto ? (values.fecha_devuelta || fechaHoy()) : null,
    })
    setSaving(false)
    if (error) {
      showToast({ variant: 'error', message: error.message })
    } else {
      showToast({ variant: 'success', message: 'Préstamo actualizado' })
      setEditTarget(null)
    }
  }

  const handleDelete = (prestamo: PrestamoConDetalles) => {
    showToast({
      variant: 'destructive',
      message: `¿Eliminar el préstamo de ${prestamo.usuario.nombre} ${prestamo.usuario.apellido}?`,
      onConfirm: async () => {
        const { error } = await eliminarPrestamo(prestamo.id)
        showToast(
          error
            ? { variant: 'error', message: 'No se pudo eliminar el préstamo' }
            : { variant: 'success', message: 'Préstamo eliminado correctamente' }
        )
      },
    })
  }

  const columns = [
    col.accessor((r) => `${r.usuario.nombre} ${r.usuario.apellido}`, {
      id: 'usuario',
      header: ({ column }) => <SortableHeader column={column} label="Usuario" />,
      cell: (i) => <span className="font-medium">{i.getValue()}</span>,
    }),
    col.accessor((r) => r.usuario.dni, {
      id: 'dni',
      header: ({ column }) => <SortableHeader column={column} label="DNI" />,
      cell: (i) => i.getValue(),
    }),
    col.accessor((r) => r.libro.title, {
      id: 'titulo',
      header: ({ column }) => <SortableHeader column={column} label="Libro" />,
      cell: (i) => <span className="font-medium">{i.getValue()}</span>,
    }),
    col.accessor((r) => r.libro.author, {
      id: 'autor',
      header: ({ column }) => <SortableHeader column={column} label="Autor" />,
      cell: (i) => i.getValue(),
    }),
    col.accessor((r) => r.libro.year, {
      id: 'año',
      header: ({ column }) => <SortableHeader column={column} label="Año" />,
      cell: (i) => i.getValue() ?? '—',
    }),
    col.accessor('fecha_prestamo', {
      header: ({ column }) => <SortableHeader column={column} label="Préstamo" />,
      cell: (i) => formatearFecha(i.getValue()),
    }),
    col.accessor('fecha_devolucion', {
      header: ({ column }) => <SortableHeader column={column} label="Límite" />,
      cell: (i) => formatearFecha(i.getValue()),
    }),
    col.accessor('fecha_devuelta', {
      header: ({ column }) => <SortableHeader column={column} label="Devuelto" />,
      cell: (i) => formatearFecha(i.getValue()),
    }),
    col.accessor('estado', {
      header: 'Estado',
      enableSorting: false,
      cell: (i) => <LoanBadge estado={i.getValue()} />,
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.original)}
            title="Eliminar"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  const marcarDevuelto = editForm.watch('marcarDevuelto')

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Préstamos</h1>
          <p className="text-sm text-muted-foreground">{prestamos.length} préstamos en total</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nuevo préstamo
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nombre o DNI..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <Select value={estadoFilter} onValueChange={(v) => setEstadoFilter(v as EstadoFilter)}>
          <SelectTrigger className="h-10 w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="retrasado">Retrasado</SelectItem>
            <SelectItem value="devuelto">Devuelto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} · {filtered.length} resultados
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) setCreateOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo préstamo</DialogTitle></DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField control={createForm.control} name="usuario_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario *</FormLabel>
                  <SearchCombobox<Usuario>
                    items={usuarios}
                    value={field.value ?? ''}
                    onChange={(id) => { field.onChange(id); field.onBlur() }}
                    getLabel={(u) => `${u.nombre} ${u.apellido}`}
                    filterFn={(u, q) => {
                      const lq = q.toLowerCase()
                      return (
                        `${u.nombre} ${u.apellido}`.toLowerCase().includes(lq) ||
                        u.dni.toLowerCase().includes(lq) ||
                        u.email.toLowerCase().includes(lq)
                      )
                    }}
                    renderRow={(u, highlighted) => (
                      <div className={cn('px-3 py-2 text-sm', highlighted && 'bg-accent')}>
                        <span className="font-medium">{u.nombre} {u.apellido}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{u.dni}</span>
                      </div>
                    )}
                    placeholder="Buscar por nombre, DNI o email..."
                    emptyMessage="No se encontró ningún usuario"
                  />
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={createForm.control} name="libro_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Libro *</FormLabel>
                  <SearchCombobox<Libro>
                    items={libros}
                    value={field.value ?? ''}
                    onChange={(id) => { field.onChange(id); field.onBlur() }}
                    getLabel={(l) => l.title}
                    filterFn={(l, q) => {
                      const lq = q.toLowerCase()
                      return (
                        l.title.toLowerCase().includes(lq) ||
                        l.author.toLowerCase().includes(lq) ||
                        String(l.year ?? '').includes(lq)
                      )
                    }}
                    renderRow={(l, highlighted) => (
                      <div className={cn('px-3 py-2 text-sm', highlighted && 'bg-accent')}>
                        <span className="font-medium">{l.title}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {l.author}{l.year ? ` · ${l.year}` : ''}
                        </span>
                      </div>
                    )}
                    placeholder="Buscar por título, autor o año..."
                    emptyMessage="No se encontró ningún libro"
                  />
                  <FormMessage />
                </FormItem>
              )} />

              {selectedUsuarioId && (
                <p className={cn('text-xs', quotaRestante <= 0 ? 'text-destructive' : 'text-green-600')}>
                  {loading
                    ? 'Consultando préstamos activos...'
                    : quotaRestante <= 0
                    ? 'Este usuario ha alcanzado el límite de 5 préstamos activos'
                    : `Este usuario puede tomar ${quotaRestante} libro${quotaRestante === 1 ? '' : 's'} más prestado${quotaRestante === 1 ? '' : 's'}`
                  }
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField control={createForm.control} name="fecha_prestamo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha préstamo *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="fecha_devolucion" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha límite *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving || quotaRestante <= 0}>{saving ? 'Creando...' : 'Crear préstamo'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar préstamo</DialogTitle></DialogHeader>
          {editTarget && (
            <div className="text-sm text-muted-foreground mb-2">
              <strong>{editTarget.usuario.nombre} {editTarget.usuario.apellido}</strong> — {editTarget.libro.title}
            </div>
          )}
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="fecha_prestamo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha préstamo *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="fecha_devolucion" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha límite *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={editForm.control} name="marcarDevuelto" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border"
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">Marcar como devuelto</FormLabel>
                </FormItem>
              )} />

              {marcarDevuelto && (
                <FormField control={editForm.control} name="fecha_devuelta" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de devolución real</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
