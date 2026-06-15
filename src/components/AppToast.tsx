import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ToastVariant = 'success' | 'error' | 'destructive'

export interface AppToastProps {
  variant: ToastVariant
  message: string
  onConfirm?: () => void
  onUndo?: () => void
  onClose: () => void
}

const DURATION = 5000

export function AppToast({ variant, message, onConfirm, onUndo, onClose }: AppToastProps) {
  const [animating, setAnimating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => setAnimating(true))
    timerRef.current = setTimeout(onClose, DURATION)
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onClose])

  const dismiss = (action?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    onClose()
    if (action) setTimeout(action, 0)
  }

  const config = {
    success: {
      wrap: 'border-green-200 bg-green-50',
      bar: 'bg-green-500',
      icon: <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />,
    },
    error: {
      wrap: 'border-red-200 bg-red-50',
      bar: 'bg-red-500',
      icon: <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />,
    },
    destructive: {
      wrap: 'border-orange-200 bg-orange-50',
      bar: 'bg-orange-500',
      icon: <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />,
    },
  }[variant]

  return (
    <div className={`relative overflow-hidden rounded-lg border shadow-lg w-[360px] ${config.wrap}`}>
      <div className="flex items-start gap-3 p-4">
        {config.icon}
        <p className="text-sm font-medium text-foreground flex-1">{message}</p>
        {variant !== 'destructive' && (
          <button
            onClick={() => dismiss()}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {variant === 'destructive' && (
        <div className="flex justify-end gap-2 px-4 pb-3">
          <Button size="sm" variant="outline" onClick={() => dismiss(onUndo)}>
            Descartar
          </Button>
          <Button
            size="sm"
            onClick={() => dismiss(onConfirm)}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Confirmar
          </Button>
        </div>
      )}

      <div
        className={`h-0.5 ${config.bar}`}
        style={{
          width: animating ? '0%' : '100%',
          transition: animating ? `width ${DURATION}ms linear` : 'none',
        }}
      />
    </div>
  )
}
