import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceDetailRoute } from '@/features/workspaces/workspace-detail'

export const Route = createFileRoute('/_authenticated/workspaces/$workspaceId')({
  component: WorkspaceDetailRoute,
})
