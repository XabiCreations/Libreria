-- ============================================================
-- PASO 1: Ejecuta este script en el SQL Editor de Supabase
-- Crea las tablas, el enum y la función auxiliar para RLS
-- ============================================================

-- Extensiones requeridas (suelen estar activas en Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum de roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
    CREATE TYPE rol_usuario AS ENUM ('admin', 'cliente');
  END IF;
END $$;

-- ─── Tabla: usuarios ───────────────────────────────────────
-- Extiende auth.users compartiendo el mismo id (UUID)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id          uuid          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      varchar       NOT NULL,
  apellido    varchar       NOT NULL,
  dni         varchar       NOT NULL UNIQUE,
  telefono    varchar       NOT NULL,
  email       varchar       NOT NULL UNIQUE,
  rol         rol_usuario   NOT NULL DEFAULT 'cliente',
  created_at  timestamptz   NOT NULL DEFAULT now()
);

-- ─── Tabla: libros ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.libros (
  id          uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       varchar NOT NULL,
  author      varchar NOT NULL,
  country     varchar,
  language    varchar,
  pages       integer,
  year        integer,
  link        varchar,
  image_url   varchar          -- URL pública en Supabase Storage (se rellena después)
);

-- ─── Tabla: prestamos ──────────────────────────────────────
-- El campo estado NO se guarda en BD; se calcula en el frontend
CREATE TABLE IF NOT EXISTS public.prestamos (
  id               uuid  PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id       uuid  NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  libro_id         uuid  NOT NULL REFERENCES public.libros(id)   ON DELETE CASCADE,
  fecha_prestamo   date  NOT NULL,
  fecha_devolucion date  NOT NULL,
  fecha_devuelta   date,                     -- NULL hasta que el cliente devuelve el libro
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── Grants explícitos (necesarios cuando se ejecuta SQL directo)
GRANT ALL ON TABLE public.usuarios  TO service_role, authenticated;
GRANT ALL ON TABLE public.libros    TO service_role, authenticated;
GRANT ALL ON TABLE public.prestamos TO service_role, authenticated;

-- ─── Función auxiliar para RLS ─────────────────────────────
-- Devuelve true si el usuario autenticado tiene rol 'admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND rol = 'admin'
  );
$$;
