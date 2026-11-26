import { createFileRoute } from '@tanstack/react-router'
import { DocPage } from '@/features/docs'

export const Route = createFileRoute('/_authenticated/docs/privacy')({
  component: () => <DocPage doc='privacy' />,
})
