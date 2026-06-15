import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar que el llamante está autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !caller) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // Verificar que el llamante es admin
    const { data: callerProfile } = await supabaseAdmin
      .from('usuarios')
      .select('rol')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.rol !== 'admin') {
      return json({ error: 'Forbidden: solo los administradores pueden crear usuarios' }, 403)
    }

    const { nombre, apellido, dni, telefono, email, password, rol } = await req.json()

    if (!nombre || !apellido || !dni || !telefono || !email || !password || !rol) {
      return json({ error: 'Faltan campos obligatorios' }, 400)
    }

    // Crear el usuario en auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return json({ error: authError.message }, 400)
    }

    // Crear el perfil en public.usuarios
    const { error: profileError } = await supabaseAdmin.from('usuarios').insert({
      id: authData.user.id,
      nombre,
      apellido,
      dni,
      telefono,
      email,
      rol,
    })

    if (profileError) {
      // Revertir la creación del usuario en auth si falla el perfil
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return json({ error: profileError.message }, 400)
    }

    return json({ user: { id: authData.user.id, email } }, 200)
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
