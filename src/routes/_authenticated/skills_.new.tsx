import { createFileRoute } from '@tanstack/react-router'
import { CreateSkill } from '@/features/skills/create-skill'

export const Route = createFileRoute('/_authenticated/skills_/new')({
  component: CreateSkill,
})
