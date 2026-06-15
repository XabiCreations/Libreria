import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AppToast, type ToastVariant } from '@/components/AppToast'

interface ToastOptions {
  variant: ToastVariant
  message: string
  onConfirm?: () => void
  onUndo?: () => void
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null)

  const showToast = useCallback((options: ToastOptions) => {
    setToast(options)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[100]">
          <AppToast
            variant={toast.variant}
            message={toast.message}
            onConfirm={toast.onConfirm}
            onUndo={toast.onUndo}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
