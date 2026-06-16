# Gestión de Préstamos de Librería

Aplicación fullstack para gestionar el catálogo de una librería y los préstamos de libros a sus usuarios, con un panel de administración y un portal de cliente.

🔗 **Demo**: [gestion-de-libreria.vercel.app](https://gestion-de-libreria.vercel.app)

---

## Stack técnico

- **Frontend**: React + Vite (TypeScript), Tailwind CSS, shadcn/ui, React Router v6
- **Estado**: Zustand (sesión/usuario)
- **Formularios**: React Hook Form + Zod
- **Tablas**: TanStack Table v8 (ordenación, paginación, búsqueda)
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Lógica de servidor**: Edge Functions (Deno) para operaciones admin + triggers de PostgreSQL para reglas de negocio
- **Seguridad**: Row Level Security (RLS) en todas las tablas

---

## Funcionalidades

### Autenticación
- Registro de cliente con validación de email, DNI, teléfono y contraseña fuerte (8+ caracteres, mayúscula, número, carácter especial), con comprobación de unicidad en tiempo real
- Inicio de sesión con email o DNI
- Mensajes de error de Supabase Auth traducidos al español
- Sesión persistente gestionada con Zustand + Supabase Auth

### Panel de administración
- **Libros**: alta, edición y baja de libros; subida de portada (Supabase Storage) o reutilización de una portada existente; búsqueda por título/autor; filtro por idioma; vista de detalle; bloqueo de borrado si el libro tiene préstamos activos
- **Préstamos**: alta de préstamo con buscador de usuario y libro, validación de fechas y de cupo disponible; edición de fechas y marcado como devuelto; eliminación con confirmación; filtro por estado (activo/retrasado/devuelto) y búsqueda por usuario
- **Usuarios**: alta, edición y baja de usuarios (vía Edge Functions con `service_role`); validación de unicidad de email/DNI/teléfono; protección contra autoedición/autoeliminación; historial de préstamos por usuario

### Portal de cliente
- Catálogo de libros con filtro de disponibilidad y búsqueda
- Reserva de libro (creación de préstamo) con bloqueo si el libro está ocupado o si se alcanzó el límite de préstamos activos
- Cancelación de préstamos propios
- Historial de préstamos (activos y devueltos)
- Dashboard con resumen visual de préstamos activos/retrasados

### Reglas de negocio (aplicadas en frontend y reforzadas en base de datos)
- Límite de **5 préstamos activos** por usuario
- Un libro no puede prestarse si ya tiene un préstamo activo
- Un libro con préstamos activos no puede eliminarse
- El estado de un préstamo (activo / retrasado / devuelto) se calcula dinámicamente a partir de las fechas

---

## Estructura del proyecto

```
src/
├── pages/
│   ├── auth/        Login y registro
│   ├── admin/        Panel de administración (libros, préstamos, usuarios)
│   └── cliente/       Portal de cliente (catálogo, historial, dashboard)
├── components/        Componentes reutilizables (toast, navbar, modales, badges...)
├── hooks/              Lógica de datos (useLibros, usePrestamos, useUsuarios, useAuth)
├── store/              Estado global (Zustand)
├── context/            Contexto de notificaciones (Toast)
├── lib/                Cliente Supabase, constantes, helpers, mapeo de errores
└── types/              Tipos TypeScript del dominio

sql/
├── 01_schema.sql       Tablas: usuarios, libros, prestamos
├── 02_rls.sql           Políticas de Row Level Security
├── 03_seed_libros.sql   Datos de ejemplo (libros)
├── 04_seed_usuarios.sql Datos de ejemplo (usuarios)
├── 05_seed_prestamos.sql Datos de ejemplo (préstamos)
└── 06_triggers.sql      Validaciones de negocio a nivel de base de datos

supabase/functions/
├── create-user/        Crear usuario (auth + perfil) como admin
├── update-user/        Editar usuario (incl. cambio de email) como admin
└── delete-user/        Eliminar usuario (cascada a préstamos) como admin
```

---

## Configuración

### Variables de entorno

Crea un fichero `.env` en la raíz con:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Base de datos

Ejecuta los scripts de `sql/` en orden (01 → 06) desde el SQL Editor de Supabase.

### Edge Functions

Despliega las funciones con la CLI de Supabase:

```bash
npx supabase functions deploy create-user
npx supabase functions deploy update-user
npx supabase functions deploy delete-user
```

Configura el secreto `ALLOWED_ORIGIN` en cada función para restringir el CORS al dominio de producción.

### Desarrollo local

```bash
npm install
npm run dev
```

### Build de producción

```bash
npm run build
```
