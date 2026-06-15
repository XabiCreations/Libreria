import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Library } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const schema = z.object({
  identifier: z.string().min(1, 'Introduce tu email o DNI'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type FormValues = z.infer<typeof schema>

export default function Login() {
  const { user } = useAuthStore()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [modo, setModo] = useState<'login' | 'recuperar'>('login')
  const [recuperarIdentifier, setRecuperarIdentifier] = useState('')
  const [recuperarLoading, setRecuperarLoading] = useState(false)
  const [recuperarMensaje, setRecuperarMensaje] = useState<string | null>(null)
  const [recuperarError, setRecuperarError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  })

  if (user) {
    return <Navigate to={user.rol === 'admin' ? '/admin/books' : '/dashboard'} replace />
  }

  const onRecuperar = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecuperarError(null)
    setRecuperarMensaje(null)
    setRecuperarLoading(true)
    try {
      let email = recuperarIdentifier.trim()
      if (!email.includes('@')) {
        const { data, error } = await supabase.rpc('get_email_by_dni', { p_dni: email })
        if (error || !data) {
          setRecuperarError('No se encontró ninguna cuenta con ese DNI.')
          setRecuperarLoading(false)
          return
        }
        email = data as string
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setRecuperarMensaje('Te hemos enviado un correo con el enlace para restablecer tu contraseña.')
    } catch {
      setRecuperarError('No se pudo enviar el correo. Inténtalo de nuevo.')
    }
    setRecuperarLoading(false)
  }

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      let email = values.identifier.trim()
      if (!email.includes('@')) {
        const { data, error } = await supabase.rpc('get_email_by_dni', { p_dni: email })
        if (error || !data) {
          setError('No se encontró ninguna cuenta con ese DNI.')
          return
        }
        email = data as string
      }
      await login(email, values.password)
    } catch {
      setError('Credenciales incorrectas. Comprueba tu email/DNI y contraseña.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Library className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestión de Préstamos</h1>
          <p className="text-sm text-muted-foreground">Accede con tu cuenta de la librería</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {modo === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}
            </CardTitle>
            <CardDescription>
              {modo === 'login'
                ? 'Introduce tus credenciales para continuar'
                : 'Te enviaremos un enlace a tu correo electrónico'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {modo === 'login' ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email o DNI</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Introduce tu email o DNI"
                            autoComplete="username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <button
                    type="button"
                    onClick={() => { setModo('recuperar'); setError(null) }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>

                  {error && (
                    <p className="text-sm font-medium text-destructive">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? 'Accediendo...' : 'Acceder'}
                  </Button>
                </form>
              </Form>
            ) : (
              <form onSubmit={onRecuperar} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email o DNI</label>
                  <Input
                    type="text"
                    placeholder="Introduce tu email o DNI"
                    value={recuperarIdentifier}
                    onChange={(e) => setRecuperarIdentifier(e.target.value)}
                    autoComplete="username"
                  />
                </div>

                {recuperarError && (
                  <p className="text-sm font-medium text-destructive">{recuperarError}</p>
                )}
                {recuperarMensaje && (
                  <p className="text-sm font-medium text-green-600">{recuperarMensaje}</p>
                )}

                <Button type="submit" className="w-full" disabled={recuperarLoading || !!recuperarMensaje}>
                  {recuperarLoading ? 'Enviando...' : 'Enviar enlace'}
                </Button>

                <button
                  type="button"
                  onClick={() => { setModo('login'); setRecuperarMensaje(null); setRecuperarError(null); setRecuperarIdentifier('') }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Volver al inicio de sesión
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-primary hover:opacity-80">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
