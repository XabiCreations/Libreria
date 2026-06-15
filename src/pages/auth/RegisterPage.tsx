import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Library } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
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

type Step = 'form' | 'verify'

interface PendingData {
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

  const [step, setStep] = useState<Step>('form')
  const [pending, setPending] = useState<PendingData | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Verify step
  const [otp, setOtp] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

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

  const insertarPerfil = async (
    userId: string,
    data: PendingData
  ): Promise<string | null> => {
    const { error } = await supabase.from('usuarios').insert({
      id: userId,
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      telefono: data.telefono,
      email: data.email,
      rol: 'cliente',
    })
    if (error) return 'No se pudo crear tu perfil. Contacta con soporte.'
    const { data: profile } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()
    if (profile) setUser(profile)
    return null
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null)
    const pendingData: PendingData = {
      nombre: values.nombre,
      apellido: values.apellido,
      dni: values.dni,
      telefono: values.telefono,
      email: values.email,
    }

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    })
    if (error) {
      setSubmitError(error.message)
      return
    }

    // Confirmación de email desactivada: sesión inmediata
    if (data.session && data.user) {
      const err = await insertarPerfil(data.user.id, pendingData)
      if (err) { setSubmitError(err); return }
      showToast({ variant: 'success', message: '¡Registro completado! Ya puedes empezar a reservar libros.' })
      setTimeout(() => navigate('/dashboard'), 3000)
      return
    }

    // Confirmación de email activada: mostrar pantalla OTP
    setPending(pendingData)
    setResendCooldown(60)
    setStep('verify')
  }

  const onVerify = async () => {
    if (!pending) return
    setVerifyLoading(true)

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: pending.email,
      token: otp,
      type: 'signup',
    })

    if (verifyErr) {
      showToast({ variant: 'error', message: 'Código incorrecto o expirado. Inténtalo de nuevo.' })
      setVerifyLoading(false)
      return
    }

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      showToast({ variant: 'error', message: 'No se pudo obtener el usuario. Inténtalo de nuevo.' })
      setVerifyLoading(false)
      return
    }

    const err = await insertarPerfil(authUser.id, pending)
    if (err) {
      showToast({ variant: 'error', message: err })
      setVerifyLoading(false)
      return
    }

    setVerifyLoading(false)
    showToast({ variant: 'success', message: '¡Registro completado! Ya puedes empezar a reservar libros.' })
    setTimeout(() => navigate('/dashboard'), 3000)
  }

  const onResend = async () => {
    if (!pending || resendCooldown > 0) return
    await supabase.auth.resend({ type: 'signup', email: pending.email })
    setResendCooldown(60)
  }

  /* ── Pantalla de verificación OTP ─────────────────────── */
  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Library className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Verifica tu email</h1>
            <p className="text-sm text-muted-foreground">
              Hemos enviado un código de 6 dígitos a{' '}
              <span className="font-medium text-foreground">{pending?.email}</span>.
              Introdúcelo a continuación.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Código de verificación</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>

              <Button
                className="w-full"
                onClick={onVerify}
                disabled={otp.length !== 6 || verifyLoading}
              >
                {verifyLoading ? 'Verificando...' : 'Verificar'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resendCooldown > 0}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Reenviar código (${resendCooldown}s)`
                    : 'Reenviar código'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  /* ── Formulario de registro ────────────────────────────── */
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
