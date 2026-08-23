'use client'

import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ReceiptActions() {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print
      </Button>
      <Button size="sm" onClick={() => window.print()}>
        <Download className="h-4 w-4" /> Download PDF
      </Button>
    </div>
  )
}
