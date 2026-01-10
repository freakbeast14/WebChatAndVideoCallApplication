import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  confirmTone?: 'default' | 'danger'
  onConfirm: () => void
  onClose: () => void
}

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmTone = 'default',
  onConfirm,
  onClose,
}: ConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className={
            confirmTone === 'danger'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : undefined
          }
          style={confirmTone === 'danger' ? { backgroundImage: 'none' } : undefined}
        >
          {confirmLabel}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)

export default ConfirmDialog
