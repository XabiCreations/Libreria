import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookPlaceholderProps {
  className?: string
  iconSize?: number
}

export function BookPlaceholder({ className, iconSize = 16 }: BookPlaceholderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-muted rounded text-muted-foreground',
        className
      )}
    >
      <BookOpen style={{ width: iconSize, height: iconSize }} />
    </div>
  )
}
