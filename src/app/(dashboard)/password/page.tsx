import { requireUser } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { ChangePasswordForm } from './change-password-form'

export const metadata = { title: 'Change Password' }

export default async function ChangePasswordPage() {
  await requireUser()
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Change Password"
        description="Choose a strong password with at least 8 characters. You will stay signed in on this device."
      />
      <ChangePasswordForm />
    </div>
  )
}
