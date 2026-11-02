import { createFileRoute } from '@tanstack/react-router'
import { AgentSkills } from '@/features/agents/agent-skills'

export const Route = createFileRoute('/_authenticated/ai/agents/$id/skills')({
  component: AgentSkillsRoute,
})

function AgentSkillsRoute() {
  const { id } = Route.useParams()
  return <AgentSkills agentId={Number(id)} />
}
