-- ============================================================
-- PASO 2: Activa RLS y crea las políticas de seguridad
-- Ejecuta DESPUÉS de sql/01_schema.sql
-- ============================================================

-- ─── Habilitar RLS ─────────────────────────────────────────
ALTER TABLE public.usuarios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.libros    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;

-- ─── Políticas: usuarios ───────────────────────────────────
-- El admin puede leer y modificar todos los registros
CREATE POLICY "admin_all_usuarios"
  ON public.usuarios FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- El cliente solo puede leer su propio registro
CREATE POLICY "cliente_read_own_usuario"
  ON public.usuarios FOR SELECT
  USING (id = auth.uid());

-- ─── Políticas: libros ─────────────────────────────────────
-- El admin puede hacer cualquier operación
CREATE POLICY "admin_all_libros"
  ON public.libros FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Cualquier usuario autenticado puede leer libros
CREATE POLICY "authenticated_read_libros"
  ON public.libros FOR SELECT
  TO authenticated
  USING (true);

-- ─── Políticas: prestamos ──────────────────────────────────
-- El admin puede hacer cualquier operación
CREATE POLICY "admin_all_prestamos"
  ON public.prestamos FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- El cliente solo puede leer sus propios préstamos
CREATE POLICY "cliente_read_own_prestamos"
  ON public.prestamos FOR SELECT
  USING (usuario_id = auth.uid());
