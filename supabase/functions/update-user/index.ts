import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !caller) return json({ error: 'Unauthorized' }, 401)

    const { data: callerProfile } = await supabaseAdmin
      .from('usuarios')
      .select('rol')
      .eq('id', caller.id)
      .single()
    if (callerProfile?.rol !== 'admin') return json({ error: 'Forbidden: solo los administradores pueden editar usuarios' }, 403)

    const { userId, nombre, apellido, dni, telefono, email, rol } = await req.json()
    if (!userId || !nombre || !apellido || !dni || !telefono || !email || !rol) {
      return json({ error: 'Faltan campos obligatorios' }, 400)
    }

    // Obtener email actual para detectar si ha cambiado
    const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
    const emailChanged = targetUser && targetUser.email !== email

    // Si el email cambió, actualizarlo en auth.users primero
    if (emailChanged) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email })
      if (authError) return json({ error: authError.message }, 400)
    }

    // Actualizar perfil en public.usuarios
    const { data: updated, error: profileError } = await supabaseAdmin
      .from('usuarios')
      .update({ nombre, apellido, dni, telefono, email, rol })
      .eq('id', userId)
      .select()
      .single()

    if (profileError) {
      // Revertir email en auth si lo habíamos cambiado
      if (emailChanged && targetUser?.email) {
        await supabaseAdmin.auth.admin.updateUserById(userId, { email: targetUser.email })
      }
      return json({ error: profileError.message }, 400)
    }

    return json({ user: updated }, 200)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
