import { Badge } from '@/components/ui/badge'
import { EstadoPrestamo } from '@/types/database'
import { LABEL_ESTADO } from '@/lib/constants'

export function LoanBadge({ estado }: { estado: EstadoPrestamo }) {
  return <Badge variant={estado}>{LABEL_ESTADO[estado]}</Badge>
}
