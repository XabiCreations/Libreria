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
    if (callerProfile?.rol !== 'admin') return json({ error: 'Forbidden: solo los administradores pueden eliminar usuarios' }, 403)

    const { userId } = await req.json()
    if (!userId) return json({ error: 'userId es obligatorio' }, 400)

    if (userId === caller.id) return json({ error: 'No puedes eliminarte a ti mismo' }, 400)

    // Eliminar de auth.users — las FK ON DELETE CASCADE se encargan de
    // public.usuarios y public.prestamos automáticamente
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return json({ error: error.message }, 400)

    return json({ success: true }, 200)
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
