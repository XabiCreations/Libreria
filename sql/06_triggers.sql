-- ============================================================
-- PASO 6: Triggers de validación server-side
-- Ejecuta en el SQL Editor de Supabase DESPUÉS de sql/02_rls.sql
--
-- Estas funciones hacen cumplir las reglas de negocio en la base
-- de datos, independientemente de si el cliente llama a la API
-- directamente (saltándose las validaciones del frontend).
-- ============================================================

-- ─── Trigger 1: Al insertar préstamo ───────────────────────
-- Valida que el libro no esté ocupado y que el usuario
-- no supere el límite de 5 libros activos simultáneos.

CREATE OR REPLACE FUNCTION public.validate_crear_prestamo()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.prestamos
    WHERE libro_id = NEW.libro_id
      AND fecha_devuelta IS NULL
      AND fecha_devolucion >= CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Este libro ya está prestado.';
  END IF;

  IF (
    SELECT COUNT(*) FROM public.prestamos
    WHERE usuario_id = NEW.usuario_id
      AND fecha_devuelta IS NULL
      AND fecha_devolucion >= CURRENT_DATE
  ) >= 5 THEN
    RAISE EXCEPTION 'Este usuario ha alcanzado el límite de 5 libros prestados.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_crear_prestamo ON public.prestamos;
CREATE TRIGGER trigger_validate_crear_prestamo
  BEFORE INSERT ON public.prestamos
  FOR EACH ROW EXECUTE FUNCTION public.validate_crear_prestamo();

-- ─── Trigger 2: Al eliminar libro ──────────────────────────
-- Impide borrar un libro que tenga préstamos activos.

CREATE OR REPLACE FUNCTION public.check_libro_sin_prestamos_activos()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.prestamos
    WHERE libro_id = OLD.id
      AND fecha_devuelta IS NULL
      AND fecha_devolucion >= CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar un libro con préstamos activos.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_libro_sin_prestamos ON public.libros;
CREATE TRIGGER trigger_check_libro_sin_prestamos
  BEFORE DELETE ON public.libros
  FOR EACH ROW EXECUTE FUNCTION public.check_libro_sin_prestamos_activos();
