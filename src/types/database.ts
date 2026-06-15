export type Rol = 'admin' | 'cliente'

export type EstadoPrestamo = 'activo' | 'retrasado' | 'devuelto'

export interface Usuario {
  id: string
  nombre: string
  apellido: string
  dni: string
  telefono: string
  email: string
  rol: Rol
  created_at: string
}

export interface Libro {
  id: string
  title: string
  author: string
  country: string | null
  language: string | null
  pages: number | null
  year: number | null
  link: string | null
  image_url: string | null
}

export interface Prestamo {
  id: string
  usuario_id: string
  libro_id: string
  fecha_prestamo: string
  fecha_devolucion: string
  fecha_devuelta: string | null
  created_at: string
}

export interface PrestamoConDetalles extends Prestamo {
  estado: EstadoPrestamo
  usuario: Usuario
  libro: Libro
}

export interface NuevoPrestamo {
  usuario_id: string
  libro_id: string
  fecha_prestamo: string
  fecha_devolucion: string
}

export interface NuevoUsuario {
  nombre: string
  apellido: string
  dni: string
  telefono: string
  email: string
  password: string
  rol: Rol
}

export interface EditarUsuario {
  nombre: string
  apellido: string
  dni: string
  telefono: string
  email: string
  rol: Rol
}

export interface NuevoLibro {
  title: string
  author: string
  country?: string
  language?: string
  pages?: number
  year?: number
  link?: string
  image_url?: string
}
