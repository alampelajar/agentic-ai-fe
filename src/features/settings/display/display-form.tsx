import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  readDisplaySettings,
  saveDisplaySettings,
  type DisplaySettings,
} from '@/lib/display-settings'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSidebar } from '@/components/ui/sidebar'
import { Switch } from '@/components/ui/switch'

/** Text size, the side menu and movement, for this device. Applied when saved. */
export function DisplayForm() {
  const { t } = useTranslation()
  const { setOpen } = useSidebar()
  const [settings, setSettings] = useState<DisplaySettings>(readDisplaySettings)

  const change = (next: Partial<DisplaySettings>) =>
    setSettings((current) => ({ ...current, ...next }))

  const save = (event: FormEvent) => {
    event.preventDefault()
    saveDisplaySettings(settings)
    setOpen(settings.sidebar === 'open')
    toast.success(t('settingsPage.display.success'))
  }

  return (
    // Kept on this device only, so a visitor may use it too (SignInPrompt).
    <form onSubmit={save} data-guest-ok className='space-y-8'>
      <fieldset className='space-y-3'>
        <legend className='text-sm font-medium'>
          {t('settingsPage.display.textSize')}
        </legend>
        <p className='text-xs text-muted-foreground'>
          {t('settingsPage.display.textSizeHelp')}
        </p>
        <RadioGroup
          value={settings.textSize}
          onValueChange={(value) =>
            change({ textSize: value as DisplaySettings['textSize'] })
          }
          className='flex flex-col gap-2 sm:flex-row sm:gap-6'
        >
          {(['normal', 'large'] as const).map((size) => (
            <div key={size} className='flex items-center gap-2'>
              <RadioGroupItem value={size} id={`text-size-${size}`} />
              <Label htmlFor={`text-size-${size}`} className='font-normal'>
                {t(`settingsPage.display.textSizes.${size}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <fieldset className='space-y-3'>
        <legend className='text-sm font-medium'>
          {t('settingsPage.display.sidebar')}
        </legend>
        <p className='text-xs text-muted-foreground'>
          {t('settingsPage.display.sidebarDescription')}
        </p>
        <RadioGroup
          value={settings.sidebar}
          onValueChange={(value) =>
            change({ sidebar: value as DisplaySettings['sidebar'] })
          }
          className='flex flex-col gap-2 sm:flex-row sm:gap-6'
        >
          {(['open', 'closed'] as const).map((state) => (
            <div key={state} className='flex items-center gap-2'>
              <RadioGroupItem value={state} id={`sidebar-${state}`} />
              <Label htmlFor={`sidebar-${state}`} className='font-normal'>
                {t(`settingsPage.display.sidebarStates.${state}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <div className='flex items-start justify-between gap-4 rounded-lg border p-4'>
        <div className='space-y-1'>
          <Label htmlFor='reduce-motion'>
            {t('settingsPage.display.reduceMotion')}
          </Label>
          <p className='text-xs text-muted-foreground'>
            {t('settingsPage.display.reduceMotionHelp')}
          </p>
        </div>
        <Switch
          id='reduce-motion'
          checked={settings.reduceMotion}
          onCheckedChange={(checked) => change({ reduceMotion: checked })}
        />
      </div>

      <Button type='submit'>{t('settingsPage.display.updateDisplay')}</Button>
    </form>
  )
}
