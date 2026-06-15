import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BookPlaceholder } from '@/components/BookPlaceholder'
import { Libro } from '@/types/database'
import { Separator } from '@/components/ui/separator'

interface BookDetailModalProps {
  libro: Libro | null
  open: boolean
  onClose: () => void
}

export function BookDetailModal({ libro, open, onClose }: BookDetailModalProps) {
  if (!libro) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{libro.title}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {libro.image_url ? (
            <img
              src={libro.image_url}
              alt={libro.title}
              className="w-[120px] h-[170px] object-cover rounded-md flex-shrink-0 shadow"
            />
          ) : (
            <BookPlaceholder className="w-[120px] h-[170px] flex-shrink-0" iconSize={40} />
          )}

          <div className="flex-1 space-y-2 text-sm min-w-0">
            <DetailRow label="Autor" value={libro.author} />
            <Separator />
            <DetailRow label="País" value={libro.country} />
            <DetailRow label="Idioma" value={libro.language} />
            <DetailRow label="Año" value={libro.year?.toString()} />
            <DetailRow label="Páginas" value={libro.pages?.toString()} />
            {libro.link && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <span className="font-medium text-muted-foreground w-16 flex-shrink-0">
                    Enlace
                  </span>
                  <a
                    href={libro.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    Wikipedia
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <span className="font-medium text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  )
}
