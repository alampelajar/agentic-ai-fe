import type { AgentModel } from './components/agent-selector'

/**
 * "Auto" in the model picker: the backend picks, per message, the model that fits what the
 * message needs (a vision model for a photo, a coding model in a workspace, a fast one otherwise)
 * and moves to the next if it fails. It is not a real model, so it has an id no model can have.
 */
export const AUTO_MODEL_ID = -1

export function autoModel(name: string, description: string): AgentModel {
  return {
    id: AUTO_MODEL_ID,
    name,
    model_id: 'auto',
    description,
    is_system: true,
    is_active: true,
    provider: { id: 0, name: 'Agentic', type: 'auto', base_url: '', is_system: true },
  }
}

export const isAutoModel = (model: Pick<AgentModel, 'id'> | null | undefined) => model?.id === AUTO_MODEL_ID

/** What the backend said about an automatic choice. */
export type AutoChoice = { name?: string; need?: string; reason?: string; fallback?: boolean }

const NEEDS = ['vision', 'coding', 'long', 'fast']

/**
 * The model line under an answer chosen automatically: "Auto → GPT-OSS-120b · fast model for an
 * ordinary question", and "(backup)" when the first choice failed.
 */
export function describeAutoAnswer(choice: AutoChoice | undefined, modelName: string, t: (key: string, values?: Record<string, unknown>) => string): string | null {
  if (!choice) return null
  const parts = [t('agentic.auto.answeredBy', { model: choice.name || modelName })]
  if (choice.need && NEEDS.includes(choice.need)) parts.push(t(`agentic.auto.need.${choice.need}`))
  if (choice.fallback) parts.push(t('agentic.auto.fallback'))
  return parts.join(' · ')
}
