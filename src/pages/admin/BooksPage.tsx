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
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table'
import { Plus, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Upload, ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2 } from 'lucide-react'
import { useLibros } from '@/hooks/useLibros'
import { useToast } from '@/context/ToastContext'
import { Libro, NuevoLibro } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { SUPABASE_STORAGE_BUCKET } from '@/lib/constants'
import { BookPlaceholder } from '@/components/BookPlaceholder'
import { BookDetailModal } from '@/components/BookDetailModal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── CoverPicker ────────────────────────────────────────────
function CoverPicker({ value, onChange, pendingFile, onFileSelect, libros }: {
  value: string
  onChange: (url: string) => void
  pendingFile: File | null
  onFileSelect: (file: File | null) => void
  libros: Libro[]
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [justDropped, setJustDropped] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  useEffect(() => {
    if (!pendingFile) { setLocalPreview(null); return }
    const url = URL.createObjectURL(pendingFile)
    setLocalPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const previewUrl = localPreview ?? value
  const selectedInDropdown = !pendingFile && value
    ? libros.find((b) => b.image_url === value)
    : null

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5 MB.')
      return
    }
    onFileSelect(file)
    onChange('')
    setDropdownOpen(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    processFile(file)
    setJustDropped(true)
    setTimeout(() => setJustDropped(false), 500)
  }

  return (
    <div ref={containerRef} className="space-y-3">

      {/* Preview */}
      {previewUrl && (
        <div className="flex items-center gap-3">
          <img
            src={previewUrl}
            alt="Portada"
            className="w-14 h-20 object-cover rounded border shadow-sm transition-all duration-300"
          />
          <div className="text-xs text-muted-foreground">
            {pendingFile
              ? <span className="text-primary font-medium">Nueva imagen seleccionada</span>
              : selectedInDropdown?.title ?? 'Portada actual'
            }
          </div>
        </div>
      )}

      {/* Modo A — dropdown de portadas existentes */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full flex items-center gap-3 h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          {selectedInDropdown?.image_url ? (
            <img src={selectedInDropdown.image_url} alt="" className="w-6 h-8 object-cover rounded-sm shrink-0" />
          ) : (
            <div className="w-6 h-8 bg-muted rounded-sm shrink-0 flex items-center justify-center">
              <BookOpen className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          <span className="truncate text-left flex-1">
            {pendingFile || !selectedInDropdown
              ? <span className="text-muted-foreground">Seleccionar portada existente</span>
              : selectedInDropdown.title
            }
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-50 transition-transform duration-200', dropdownOpen && 'rotate-180')} />
        </button>

        {dropdownOpen && (
          <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md overflow-y-auto max-h-60">
            <button
              type="button"
              className={cn('w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors', !value && !pendingFile && 'bg-accent')}
              onClick={() => { onChange(''); onFileSelect(null); setDropdownOpen(false) }}
            >
              <div className="w-6 h-8 bg-muted rounded-sm shrink-0 flex items-center justify-center">
                <BookOpen className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground">Sin portada</span>
            </button>
            {libros.filter((b) => b.image_url).map((b) => (
              <button
                key={b.id}
                type="button"
                className={cn('w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors', !pendingFile && value === b.image_url && 'bg-accent')}
                onClick={() => { onChange(b.image_url!); onFileSelect(null); setDropdownOpen(false) }}
              >
                <img src={b.image_url!} alt="" className="w-6 h-8 object-cover rounded-sm shrink-0" />
                <span className="truncate text-left">{b.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground px-1">o</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Modo B — zona drag-and-drop + clic */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          // base
          'relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 cursor-pointer select-none',
          'transition-all duration-200 ease-in-out',
          // default
          'border-muted-foreground/25 bg-transparent text-muted-foreground',
          // hover (no drag)
          !isDragging && 'hover:border-muted-foreground/50 hover:bg-muted/30 hover:text-foreground',
          // dragging over
          isDragging && 'border-primary bg-primary/10 text-primary scale-[1.02] shadow-sm',
          // just dropped — brief scale-down bounce
          justDropped && 'scale-[0.97]',
          // has pending file
          pendingFile && !isDragging && 'border-primary/50 bg-primary/5 text-primary',
        )}
      >
        {/* Icono central */}
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200',
          isDragging ? 'bg-primary/15' : pendingFile ? 'bg-primary/10' : 'bg-muted',
        )}>
          {isDragging ? (
            <ArrowDown className="h-5 w-5 animate-bounce text-primary" />
          ) : pendingFile ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
        </div>

        {/* Texto */}
        <div className="text-center">
          {isDragging ? (
            <p className="text-sm font-medium text-primary">Suelta para subir</p>
          ) : pendingFile ? (
            <>
              <p className="text-sm font-medium truncate max-w-[200px]">{pendingFile.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Clic para cambiar</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Arrastra una imagen aquí</p>
              <p className="text-xs mt-0.5">o haz clic para seleccionar</p>
              <p className="text-xs mt-1 text-muted-foreground/70">PNG, JPG, WEBP · máx. 5 MB</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── LoadingSpinner ─────────────────────────────────────────
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('animate-spin', className)}
      fill="currentColor"
      aria-hidden="true"
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1="12" y1="5"
          x2="12" y2="2"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            transform: `rotate(${i * 30}deg)`,
            transformOrigin: '12px 12px',
            opacity: (i + 1) / 12,
          }}
        />
      ))}
    </svg>
  )
}

// ─── SortableHeader ─────────────────────────────────────────
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

// ─── Schema ─────────────────────────────────────────────────
const schema = z.object({
  title: z.string().min(1, ''),
  author: z.string().min(1, ''),
  country: z.string().optional(),
  language: z.string().optional(),
  pages: z.coerce.number().positive('Debe ser positivo').int().optional().or(z.literal(NaN)),
  year: z.coerce.number().int('Debe ser un entero').optional().or(z.literal(NaN)),
  link: z.string().optional(),
  image_url: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const col = createColumnHelper<Libro>()

// ─── BooksPage ───────────────────────────────────────────────
export default function BooksPage() {
  const { libros, loading, fetchLibros, crearLibro, actualizarLibro, eliminarLibro } = useLibros()
  const { showToast } = useToast()

  const [globalFilter, setGlobalFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Libro | null>(null)
  const [detailBook, setDetailBook] = useState<Libro | null>(null)
  const [saving, setSaving] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const uniqueLanguages = useMemo(() =>
    [...new Set(libros.map((l) => l.language).filter((l): l is string => !!l))].sort(),
    [libros]
  )

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => { fetchLibros() }, [fetchLibros])

  const openCreate = () => {
    form.reset({ title: '', author: '', country: '', language: '', link: '', image_url: '' })
    setCoverFile(null)
    setEditingBook(null)
    setFormOpen(true)
  }

  const openEdit = (libro: Libro) => {
    form.reset({
      title: libro.title,
      author: libro.author,
      country: libro.country ?? '',
      language: libro.language ?? '',
      pages: libro.pages ?? undefined,
      year: libro.year ?? undefined,
      link: libro.link ?? '',
      image_url: libro.image_url ?? '',
    })
    setCoverFile(null)
    setEditingBook(libro)
    setFormOpen(true)
  }

  const onSubmit = async (values: FormValues) => {
    setSaving(true)

    let imageUrl: string | undefined = values.image_url || undefined

    // Si el usuario eligió un archivo nuevo, subirlo primero
    if (coverFile) {
      const ext = coverFile.name.split('.').pop() ?? 'jpg'
      const bookId = editingBook?.id ?? crypto.randomUUID()
      const path = `covers/${bookId}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(path, coverFile, { cacheControl: '3600', upsert: true })

      if (uploadError) {
        setSaving(false)
        showToast({ variant: 'error', message: 'Error al subir la imagen' })
        return
      }

      const { data: urlData } = supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(path)

      imageUrl = urlData.publicUrl
    }

    const payload: NuevoLibro = {
      title: values.title,
      author: values.author,
      country: values.country || undefined,
      language: values.language || undefined,
      pages: isNaN(values.pages as number) ? undefined : values.pages as number,
      year: isNaN(values.year as number) ? undefined : values.year as number,
      link: values.link || undefined,
      image_url: imageUrl,
    }

    const { error } = editingBook
      ? await actualizarLibro(editingBook.id, payload)
      : await crearLibro(payload)

    setSaving(false)

    if (error) {
      showToast({ variant: 'error', message: error.message })
    } else {
      showToast({ variant: 'success', message: editingBook ? 'Libro actualizado' : 'Libro creado' })
      setCoverFile(null)
      setFormOpen(false)
    }
  }

  const handleDelete = (libro: Libro) => {
    showToast({
      variant: 'destructive',
      message: `¿Eliminar "${libro.title}"?`,
      onConfirm: async () => {
        const { error } = await eliminarLibro(libro.id)
        showToast(
          error
            ? { variant: 'error', message: 'No se puede eliminar el libro' }
            : { variant: 'success', message: 'Libro eliminado correctamente' }
        )
      },
    })
  }

  const columns = [
    col.accessor('image_url', {
      header: '',
      enableSorting: false,
      cell: (info) => {
        const url = info.getValue()
        return url
          ? <img src={url} alt="" className="w-10 h-14 object-cover rounded" />
          : <BookPlaceholder className="w-10 h-14" iconSize={14} />
      },
    }),
    col.accessor('title', {
      header: ({ column }) => <SortableHeader column={column} label="Título" />,
      cell: (i) => <span className="font-medium">{i.getValue()}</span>,
    }),
    col.accessor('author', {
      header: ({ column }) => <SortableHeader column={column} label="Autor" />,
      enableColumnFilter: true,
      filterFn: 'equals',
    }),
    col.accessor('year', {
      header: ({ column }) => <SortableHeader column={column} label="Año" />,
      cell: (i) => i.getValue() ?? '—',
    }),
    col.accessor('pages', {
      header: ({ column }) => <SortableHeader column={column} label="Páginas" />,
      cell: (i) => i.getValue() ?? '—',
    }),
    col.accessor('language', {
      header: ({ column }) => <SortableHeader column={column} label="Idioma" />,
      enableColumnFilter: true,
      filterFn: 'equals',
      cell: (i) => i.getValue() ?? '—',
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => setDetailBook(row.original)} title="Ver detalle">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original)} title="Eliminar" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: libros,
    columns,
    state: { globalFilter, sorting, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, _col, value: string) => {
      const v = value.toLowerCase()
      return (
        row.original.title.toLowerCase().includes(v) ||
        row.original.author.toLowerCase().includes(v)
      )
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Libros</h1>
          <p className="text-sm text-muted-foreground">{libros.length} libros en el catálogo</p>
        </div>
        <Button onClick={openCreate} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Añadir libro
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por título o autor..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
       
        <Select
          value={(table.getColumn('language')?.getFilterValue() as string | undefined) ?? '__all__'}
          onValueChange={(v) => table.getColumn('language')?.setFilterValue(v === '__all__' ? undefined : v)}
        >
          <SelectTrigger className="h-10 w-[180px]">
            <SelectValue placeholder="Idioma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los lenguajes</SelectItem>
            {uniqueLanguages.map((lang) => (
              <SelectItem key={lang} value={lang} >
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => setDetailBook(row.original)}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={cell.column.id === 'actions' ? (e) => e.stopPropagation() : undefined}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          {' · '}{table.getFilteredRowModel().rows.length} resultados
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

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setCoverFile(null); setFormOpen(false) } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Editar libro' : 'Añadir libro'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Título *</FormLabel>
                    <FormControl><Input placeholder="Cien años de soledad" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="author" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Autor *</FormLabel>
                    <FormControl><Input placeholder="Gabriel García Márquez" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl><Input placeholder="Colombia" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="language" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idioma</FormLabel>
                    <FormControl><Input placeholder="Español" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año</FormLabel>
                    <FormControl><Input type="number" placeholder="1967" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pages" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Páginas</FormLabel>
                    <FormControl><Input type="number" min={1} placeholder="432" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="link" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Enlace Wikipedia</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="image_url" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Portada</FormLabel>
                    <FormControl>
                      <CoverPicker
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        pendingFile={coverFile}
                        onFileSelect={setCoverFile}
                        libros={libros}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setCoverFile(null); setFormOpen(false) }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="gap-2 min-w-[90px]">
                  {saving ? 'Guardando' : 'Guardar'}
                  {saving && <LoadingSpinner className="h-4 w-4" />}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <BookDetailModal libro={detailBook} open={!!detailBook} onClose={() => setDetailBook(null)} />
    </div>
  )
}
