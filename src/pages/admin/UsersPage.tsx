import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type SortingState,
} from '@tanstack/react-table'
import { Plus, ChevronLeft, Check, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUsuarios } from '@/hooks/useUsuarios'
import { usePrestamos } from '@/hooks/usePrestamos'
import { useToast } from '@/context/ToastContext'
import { Usuario } from '@/types/database'
import { formatearFecha } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LoanBadge } from '@/components/LoanBadge'
import { BookPlaceholder } from '@/components/BookPlaceholder'

const schema = z.object({
  nombre: z.string().min(1, ''),
  apellido: z.string().min(1, ''),
  dni: z.string().min(9, 'El DNI debe tener 9 caracteres').max(9, 'El DNI debe tener 9 caracteres'),
  telefono: z.string().min(9, 'El teléfono debe tener al menos 9 dígitos'),
  email: z.string().email('Email no válido'),
  password: z.string()
    .min(8, '')
    .regex(/[A-Z]/, '')
    .regex(/[0-9]/, '')
    .regex(/[^a-zA-Z0-9]/, ''),
  rol: z.enum(['admin', 'cliente']),
})

type FormValues = z.infer<typeof schema>

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres',          test: (v: string) => v.length >= 8 },
  { label: 'Al menos 1 mayúscula',         test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Al menos 1 número',            test: (v: string) => /[0-9]/.test(v) },
  { label: 'Al menos 1 carácter especial', test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
]

function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul className="mt-0.5 space-y-0.5">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value)
        return (
          <li key={rule.label} className={cn('flex items-center gap-1.5 text-xs transition-colors', met ? 'text-green-600' : 'text-muted-foreground')}>
            <Check className={cn('h-3 w-3 shrink-0', !met && 'invisible')} />
            <span className={cn(met && 'line-through')}>{rule.label}</span>
          </li>
        )
      })}
    </ul>
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

const col = createColumnHelper<Usuario>()

export default function UsersPage() {
  const { usuarios, loading, fetchUsuarios, crearUsuario } = useUsuarios()
  const { prestamos, fetchPrestamos } = usePrestamos()
  const { showToast } = useToast()

  const [globalFilter, setGlobalFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [saving, setSaving] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rol: 'cliente' },
  })

  useEffect(() => {
    fetchUsuarios()
    fetchPrestamos()
  }, [fetchUsuarios, fetchPrestamos])

  const userPrestamos = selectedUser
    ? prestamos.filter((p) => p.usuario_id === selectedUser.id)
    : []

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    const { error } = await crearUsuario(values)
    setSaving(false)
    if (error) {
      showToast({ variant: 'error', message: 'Error al crear usuario' })
    } else {
      showToast({ variant: 'success', message: 'Usuario creado correctamente' })
      setFormOpen(false)
      form.reset()
    }
  }

  const columns = [
    col.accessor((r) => `${r.nombre} ${r.apellido}`, {
      id: 'nombre',
      header: ({ column }) => <SortableHeader column={column} label="Nombre" />,
      cell: (i) => <span className="font-medium">{i.getValue()}</span>,
    }),
    col.accessor('dni', {
      header: ({ column }) => <SortableHeader column={column} label="DNI" />,
    }),
    col.accessor('email', {
      header: ({ column }) => <SortableHeader column={column} label="Email" />,
    }),
    col.accessor('telefono', {
      header: ({ column }) => <SortableHeader column={column} label="Teléfono" />,
    }),
    col.accessor('rol', {
      header: 'Rol',
      enableSorting: false,
      cell: (i) => (
        <Badge variant={i.getValue() === 'admin' ? 'default' : 'secondary'} className="capitalize">
          {i.getValue()}
        </Badge>
      ),
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(row.original)}>
          Ver historial
        </Button>
      ),
    }),
  ]

  const table = useReactTable({
    data: usuarios,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _col, value: string) => {
      const v = value.toLowerCase()
      const u = row.original
      return (
        `${u.nombre} ${u.apellido}`.toLowerCase().includes(v) ||
        u.dni.toLowerCase().includes(v) ||
        u.email.toLowerCase().includes(v)
      )
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (selectedUser) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Volver
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{selectedUser.nombre} {selectedUser.apellido}</h1>
            <p className="text-sm text-muted-foreground">{selectedUser.dni} · {selectedUser.email}</p>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-medium">Historial de préstamos ({userPrestamos.length})</h2>
          </div>
          {userPrestamos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Sin préstamos registrados</p>
          ) : (
            <div className="divide-y">
              {userPrestamos.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-4">
                  {p.libro.image_url ? (
                    <img src={p.libro.image_url} alt="" className="w-10 h-14 object-cover rounded flex-shrink-0" />
                  ) : (
                    <BookPlaceholder className="w-10 h-14 flex-shrink-0" iconSize={14} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.libro.title}</p>
                    <p className="text-sm text-muted-foreground">{p.libro.author}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatearFecha(p.fecha_prestamo)} → {formatearFecha(p.fecha_devolucion)}
                    </p>
                  </div>
                  <LoanBadge estado={p.estado} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">{usuarios.length} usuarios registrados</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      <Input
        placeholder="Buscar por nombre, DNI o email..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border bg-card">
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
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelectedUser(row.original)}>
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

      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) setFormOpen(false) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Crear usuario</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="nombre" render={({ field }) => (
                  <FormItem><FormLabel>Nombre *</FormLabel><FormControl><Input placeholder="Ana" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="apellido" render={({ field }) => (
                  <FormItem><FormLabel>Apellido *</FormLabel><FormControl><Input placeholder="García" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dni" render={({ field }) => (
                  <FormItem><FormLabel>DNI *</FormLabel><FormControl><Input placeholder="12345678A" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="telefono" render={({ field }) => (
                  <FormItem><FormLabel>Teléfono *</FormLabel><FormControl><Input placeholder="612 345 678" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>Email *</FormLabel><FormControl><Input type="email" placeholder="ana@ejemplo.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Contraseña *</FormLabel>
                    <FormControl><Input type="password" placeholder="Mínimo 8 caracteres" {...field} /></FormControl>
                    <PasswordRequirements value={field.value || ''} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="rol" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="cliente">Cliente</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Creando...' : 'Crear usuario'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
