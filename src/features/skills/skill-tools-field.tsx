import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

/**
 * The tools a skill may ask for, grouped as the person thinks of them. They mirror the backend's
 * AllowedSkillTools registry (services/skills.go); a tool outside it makes the skill invalid.
 * Asking for a tool never skips approval: changing tools still need the person's OK each time.
 */
export const SKILL_TOOL_GROUPS = {
  workspace: [
    'workspace.list_files',
    'workspace.read_file',
    'workspace.write_file',
    'workspace.get_changes',
    'workspace.install_dependencies',
    'workspace.build',
    'workspace.run_test',
    'workspace.get_execution',
  ],
  desktop: [
    'desktop.status',
    'desktop.screenshot',
    'desktop.list_windows',
    'desktop.inspect',
    'desktop.focus_window',
    'desktop.launch_application',
    'desktop.click',
    'desktop.double_click',
    'desktop.type',
    'desktop.hotkey',
    'desktop.scroll',
    'desktop.wait',
    'desktop.stop',
  ],
} as const

type Props = { value: string[]; onChange: (tools: string[]) => void }

export function SkillToolsField({ value, onChange }: Props) {
  const { t } = useTranslation()
  const toggle = (tool: string, checked: boolean) =>
    onChange(checked ? [...value, tool] : value.filter((current) => current !== tool))

  return (
    <fieldset className='grid gap-3'>
      <legend className='text-sm font-medium'>{t('skillsPage.form.tools')}</legend>
      <p className='text-xs text-muted-foreground'>{t('skillsPage.form.toolsHint')}</p>
      {(Object.keys(SKILL_TOOL_GROUPS) as (keyof typeof SKILL_TOOL_GROUPS)[]).map((group) => (
        <div key={group} className='grid gap-2'>
          <p className='text-xs font-medium text-muted-foreground'>{t(`skillsPage.form.toolGroups.${group}`)}</p>
          <div className='grid gap-2 sm:grid-cols-2'>
            {SKILL_TOOL_GROUPS[group].map((tool) => (
              <div key={tool} className='flex items-center gap-2'>
                <Checkbox id={`skill-tool-${tool}`} checked={value.includes(tool)} onCheckedChange={(checked) => toggle(tool, checked === true)} />
                <Label htmlFor={`skill-tool-${tool}`} className='font-mono text-xs font-normal'>{tool}</Label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  )
}
