import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { fonts } from '@/config/fonts'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFont } from '@/context/font-provider'
import { useTheme } from '@/context/theme-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ThemePreview } from './theme-preview'

const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark']),
  font: z.enum(fonts),
})

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>

export function AppearanceForm() {
  const { t } = useTranslation()
  const { font, setFont } = useFont()
  const { theme, setTheme } = useTheme()

  // This can come from your database or API.
  const defaultValues: Partial<AppearanceFormValues> = {
    theme: theme as 'light' | 'dark',
    font,
  }

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues,
  })

  function onSubmit(data: AppearanceFormValues) {
    const themeChanged = data.theme != theme
    const fontChanged = data.font != font
    if (fontChanged) setFont(data.font)
    if (themeChanged) setTheme(data.theme)

    if (themeChanged) {
      toast.success(
        t(
          data.theme === 'dark'
            ? 'settingsPage.appearance.changedToDark'
            : 'settingsPage.appearance.changedToLight'
        )
      )
    }
    if (fontChanged) {
      toast.success(
        t('settingsPage.appearance.fontChanged', { font: data.font })
      )
    }
    if (!themeChanged && !fontChanged) {
      toast.info(t('settingsPage.appearance.nothingChanged'))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='font'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settingsPage.appearance.font')}</FormLabel>
              <div className='relative w-max'>
                <FormControl>
                  <select
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-50 appearance-none font-normal capitalize',
                      'dark:bg-background dark:hover:bg-background'
                    )}
                    {...field}
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <ChevronDownIcon className='absolute inset-e-3 top-2.5 h-4 w-4 opacity-50' />
              </div>
              <FormDescription className='font-manrope'>
                {t('settingsPage.appearance.fontDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='theme'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settingsPage.appearance.theme')}</FormLabel>
              <FormDescription>
                {t('settingsPage.appearance.themeDescription')}
              </FormDescription>
              <FormMessage />
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className='grid max-w-md grid-cols-2 gap-8 pt-2'
              >
                <FormItem>
                  <FormLabel className='[&:has([data-state=checked])>div]:border-primary'>
                    <FormControl>
                      <RadioGroupItem value='light' className='sr-only' />
                    </FormControl>
                    <div className='items-center rounded-md border-2 border-muted p-1 hover:border-accent'>
                      <ThemePreview mode='light' />
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {t('settingsPage.appearance.light')}
                    </span>
                  </FormLabel>
                </FormItem>
                <FormItem>
                  <FormLabel className='[&:has([data-state=checked])>div]:border-primary'>
                    <FormControl>
                      <RadioGroupItem value='dark' className='sr-only' />
                    </FormControl>
                    <div className='items-center rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground'>
                      <ThemePreview mode='dark' />
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {t('settingsPage.appearance.dark')}
                    </span>
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormItem>
          )}
        />

        <Button type='submit'>
          {t('settingsPage.appearance.updatePreferences')}
        </Button>
      </form>
    </Form>
  )
}
