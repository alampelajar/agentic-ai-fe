import { createFileRoute } from '@tanstack/react-router'
import { DesignEditorPage } from '@/features/design-studio'

function DesignEditorRoute() {
  const { projectId } = Route.useParams()
  return <DesignEditorPage key={projectId} projectId={Number(projectId)} />
}

export const Route = createFileRoute('/_authenticated/design-studio/$projectId')({
  component: DesignEditorRoute,
})
