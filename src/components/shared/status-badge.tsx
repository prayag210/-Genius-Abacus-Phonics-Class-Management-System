import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'

const variantClasses: Record<Variant, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  secondary: 'bg-secondary text-secondary-foreground border-border',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  outline: 'bg-transparent text-foreground border-border',
  success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  info: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
}

export function StatusBadge({
  label,
  variant = 'secondary',
  className,
}: {
  label: string
  variant?: Variant
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn('font-medium', variantClasses[variant], className)}>
      {label}
    </Badge>
  )
}

/** Map a domain status string to a badge variant + friendly label. */
export function statusBadgeProps(status: string): { label: string; variant: Variant } {
  switch (status) {
    // students / teachers / courses / levels / batches
    case 'ACTIVE':
      return { label: 'Active', variant: 'success' }
    case 'INACTIVE':
      return { label: 'Inactive', variant: 'secondary' }
    case 'COMPLETED':
      return { label: 'Completed', variant: 'info' }
    case 'LEFT':
      return { label: 'Left', variant: 'destructive' }
    case 'DROPPED':
      return { label: 'Dropped', variant: 'destructive' }
    case 'ON_HOLD':
      return { label: 'On Hold', variant: 'warning' }
    // fees
    case 'PAID':
      return { label: 'Paid', variant: 'success' }
    case 'PARTIALLY_PAID':
      return { label: 'Partially Paid', variant: 'warning' }
    case 'PENDING':
      return { label: 'Pending', variant: 'secondary' }
    case 'OVERDUE':
      return { label: 'Overdue', variant: 'destructive' }
    // attendance
    case 'PRESENT':
      return { label: 'Present', variant: 'success' }
    case 'ABSENT':
      return { label: 'Absent', variant: 'destructive' }
    case 'LATE':
      return { label: 'Late', variant: 'warning' }
    // homework
    case 'SUBMITTED':
      return { label: 'Submitted', variant: 'info' }
    case 'REVIEWED':
      return { label: 'Reviewed', variant: 'success' }
    case 'NOT_STARTED':
      return { label: 'Not Started', variant: 'secondary' }
    case 'IN_PROGRESS':
      return { label: 'In Progress', variant: 'info' }
    // payments
    case 'CASH':
      return { label: 'Cash', variant: 'secondary' }
    case 'UPI':
      return { label: 'UPI', variant: 'info' }
    case 'BANK_TRANSFER':
      return { label: 'Bank Transfer', variant: 'default' }
    case 'OTHER':
      return { label: 'Other', variant: 'outline' }
    // calendar
    case 'CLASS':
      return { label: 'Class', variant: 'info' }
    case 'TEST':
      return { label: 'Test', variant: 'destructive' }
    case 'EVENT':
      return { label: 'Event', variant: 'default' }
    case 'HOLIDAY':
      return { label: 'Holiday', variant: 'warning' }
    case 'MEETING':
      return { label: 'Meeting', variant: 'secondary' }
    default:
      return { label: status, variant: 'secondary' }
  }
}

export function DomainStatusBadge({ status }: { status: string }) {
  const props = statusBadgeProps(status)
  return <StatusBadge {...props} />
}
