'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { IndianRupee } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FormDialog, fetchApiError } from '@/components/shared/form-dialog'
import { formatCurrency, todayISO } from '@/lib/utils'
import { paymentCreateSchema } from '@/lib/validations/fee'

/** Form-level schema: keep paymentDate as yyyy-mm-dd string for the date input. */
const formSchema = paymentCreateSchema.extend({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date is required'),
})
type PaymentFormValues = z.infer<typeof formSchema>

export type PayableFeeRecord = {
  id: string
  studentName: string
  courseName: string
  levelName: string
  totalFee: number
  paidAmount: number
}

export function PaymentDialog({
  fee,
  open,
  onOpenChange,
}: {
  fee: PayableFeeRecord | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const remaining = fee ? fee.totalFee - fee.paidAmount : 0

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    values: fee
      ? {
          feeRecordId: fee.id,
          amount: remaining,
          paymentDate: todayISO(),
          method: 'CASH',
          transactionRef: '',
          notes: '',
        }
      : undefined,
  })

  async function onSubmit(values: PaymentFormValues) {
    if (!fee) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        toast.error(await fetchApiError(res))
        return
      }
      const data = (await res.json()) as { receiptNumber: string }
      toast.success(`Payment recorded. Receipt ${data.receiptNumber}.`)
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!fee) return null

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record Payment"
      description={`${fee.studentName} — ${fee.courseName} ${fee.levelName}`}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      submitLabel="Record Payment"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-center">
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">Total Fee</p>
            <p className="text-sm font-semibold tabular-nums">{formatCurrency(fee.totalFee)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">Paid</p>
            <p className="text-sm font-semibold tabular-nums">{formatCurrency(fee.paidAmount)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">Remaining</p>
            <p className="text-sm font-semibold tabular-nums text-amber-600">
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (₹) *</FormLabel>
              <FormControl>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="number" min="1" max={remaining} step="1" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
              {remaining > 2000 && (
                <div className="flex gap-1.5 pt-1">
                  {[2000, 4000, remaining].map((amt, i) => (
                    <button
                      key={i}
                      type="button"
                      className="rounded-full border border-border bg-card px-2.5 py-1 text-xs hover:bg-secondary"
                      onClick={() => form.setValue('amount', amt)}
                    >
                      {formatCurrency(amt)}
                    </button>
                  ))}
                </div>
              )}
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Date *</FormLabel>
                <FormControl>
                  <Input type="date" max={todayISO()} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Method *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="transactionRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction Reference</FormLabel>
              <FormControl>
                <Input placeholder="e.g. UPI ref no." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Optional notes…" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormDialog>
  )
}
