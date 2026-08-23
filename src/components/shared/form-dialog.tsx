'use client'

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Save',
  submitting = false,
  wide = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  onSubmit?: () => void
  submitLabel?: string
  submitting?: boolean
  wide?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className={wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit?.()
          }}
          className="space-y-4"
        >
          <div className="max-h-[65vh] overflow-y-auto pr-1 -mr-1">
            {children}
          </div>
          <DialogFooter className="gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            {onSubmit && (
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitLabel}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Helper to build API error messages from a failed fetch response. */
export async function fetchApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; details?: Record<string, string> }
    if (data.details && Object.keys(data.details).length > 0) {
      const first = Object.entries(data.details)[0]
      return `${data.error ?? 'Validation failed'}: ${first[1]}`
    }
    return data.error ?? `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}
