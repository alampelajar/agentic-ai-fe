import { createFileRoute } from '@tanstack/react-router'
import { DesktopRuntime } from '@/features/desktop-runtime'

export const Route = createFileRoute('/_authenticated/settings/desktop')({
  component: DesktopRuntime,
})
