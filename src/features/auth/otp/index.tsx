import { useSearch } from '@tanstack/react-router'
import { AuthLayout } from '../components/auth-layout'
import { OtpForm } from './components/otp-form'

export function Otp() {
  const { email } = useSearch({ from: '/(auth)/otp' })

  return (
    <AuthLayout>
      <OtpForm initialEmail={email ?? ''} />
    </AuthLayout>
  )
}
