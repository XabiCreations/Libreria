import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Library } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { traducirErrorAuth } from '@/lib/authErrors'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface PerfilData {
  nombre: string
  apellido: string
  dni: string
  telefono: string
  email: string
}

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
          <li
            key={rule.label}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              met ? 'text-green-600' : 'text-muted-foreground'
            )}
          >
            <Check className={cn('h-3 w-3 shrink-0', !met && 'invisible')} />
            <span className={cn(met && 'line-through')}>{rule.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  dni: z
    .string()
    .min(9, 'El DNI debe tener 9 caracteres')
    .max(9, 'El DNI debe tener 9 caracteres'),
  telefono: z.string().min(9, 'Teléfono inválido'),
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, '')
    .regex(/[A-Z]/, '')
    .regex(/[0-9]/, '')
    .regex(/[^a-zA-Z0-9]/, ''),
})

type FormValues = z.infer<typeof formSchema>

const MENSAJES_UNICIDAD = {
  email: 'Este email ya está registrado',
  dni: 'Este DNI ya está en uso',
  telefono: 'Este teléfono ya está registrado',
} as const

export default function RegisterPage() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: '', apellido: '', dni: '', telefono: '', email: '', password: '' },
    mode: 'onTouched',
  })

  if (user) return <Navigate to="/dashboard" replace />

  const checkUnicidad = async (campo: 'email' | 'dni' | 'telefono', valor: string) => {
    if (!valor) return
    const isValid = await form.trigger(campo)
    if (!isValid) return
    const { data, error } = await supabase.rpc('check_usuario_campo', {
      p_campo: campo,
      p_valor: valor,
    })
    if (!error && data === true) {
      form.setError(campo, { message: MENSAJES_UNICIDAD[campo] })
    }
  }

  const insertarPerfil = async (userId: string, datos: PerfilData): Promise<string | null> => {
    const { error } = await supabase.from('usuarios').insert({
      id: userId,
      nombre: datos.nombre,
      apellido: datos.apellido,
      dni: datos.dni,
      telefono: datos.telefono,
      email: datos.email,
      rol: 'cliente',
    })
    if (error) return 'No se pudo crear tu perfil. Contacta con soporte.'
    const { data: profile } = await supabase.from('usuarios').select('*').eq('id', userId).single()
    if (profile) setUser(profile)
    return null
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null)

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setSubmitError(traducirErrorAuth(error.message))
      return
    }

    if (!data.user) {
      setSubmitError('No se pudo crear la cuenta. Inténtalo de nuevo.')
      return
    }

    const err = await insertarPerfil(data.user.id, {
      nombre: values.nombre,
      apellido: values.apellido,
      dni: values.dni,
      telefono: values.telefono,
      email: values.email,
    })

    if (err) {
      setSubmitError(err)
      return
    }

    showToast({ variant: 'success', message: '¡Registro completado! Ya puedes empezar a reservar libros.' })
    setTimeout(() => navigate('/dashboard'), 3000)
  }

  const hasErrors = Object.keys(form.formState.errors).length > 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Library className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">Regístrate para acceder al catálogo</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Datos personales</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Ana" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apellido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                          <Input placeholder="García López" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12345678A"
                          {...field}
                          onBlur={async (e) => {
                            field.onBlur()
                            await checkUnicidad('dni', e.target.value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 456 789"
                          {...field}
                          onBlur={async (e) => {
                            field.onBlur()
                            await checkUnicidad('telefono', e.target.value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="ana@ejemplo.com"
                          {...field}
                          onBlur={async (e) => {
                            field.onBlur()
                            await checkUnicidad('email', e.target.value)
                          }}
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
                          placeholder="Mínimo 8 caracteres"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <PasswordRequirements value={field.value || ''} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {submitError && (
                  <p className="text-sm font-medium text-destructive">{submitError}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting || hasErrors}
                >
                  {form.formState.isSubmitting ? 'Creando cuenta...' : 'Registrarse'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-primary hover:opacity-80">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
