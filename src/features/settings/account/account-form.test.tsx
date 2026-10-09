import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { AccountForm } from './account-form'
import { getCurrentUser, updateCurrentUserProfile } from '@/lib/api-auth'

vi.mock('@/lib/api-auth', () => ({
  getCurrentUser: vi.fn(),
  updateCurrentUserProfile: vi.fn(),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: { auth: { user: { accountNo: string; email: string; role: string[]; exp: number } } }) => unknown) =>
    selector({
      auth: {
        user: {
          accountNo: 'USER_7',
          email: 'alam@example.com',
          role: ['user'],
          exp: 9999999999999,
        },
      },
    }),
}))
vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    'common.loading': 'Loading',
    'common.reset': 'Reset',
    'settingsPage.account.name': 'Name',
    'settingsPage.account.namePlaceholder': 'Your name',
    'settingsPage.account.email': 'Email',
    'settingsPage.account.profilePhoto': 'Profile photo',
    'settingsPage.account.chooseAvatar': 'Choose an avatar below.',
    'settingsPage.account.avatarDescription': 'Your avatar appears in navigation.',
    'settingsPage.account.profileNameHint': 'Use a name between 2 and 30 characters.',
    'settingsPage.account.emailReadOnly': 'Email cannot be edited.',
    'settingsPage.account.profileLoadError': 'Could not load profile.',
    'settingsPage.account.profileNameError': 'Name must contain between 2 and 30 characters.',
    'settingsPage.account.profileSaveError': 'Could not save profile.',
    'settingsPage.account.profileSaveSuccess': 'Profile updated successfully.',
    'settingsPage.account.saving': 'Saving...',
    'settingsPage.account.saveChanges': 'Save Changes',
  }
  const t = (key: string) => translations[key] ?? key
  return { useTranslation: () => ({ t }) }
})

describe('AccountForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 7,
      name: 'Alam',
      email: 'alam@example.com',
      avatar: 'preset:lorelei',
    })
    vi.mocked(updateCurrentUserProfile).mockResolvedValue({
      id: 7,
      name: 'Alam RPL',
      email: 'alam@example.com',
      avatar: 'preset:adventurer',
    })
  })

  it('loads the current profile and saves a changed name and avatar preset', async () => {
    const screen = await render(<AccountForm />)
    const nameInput = screen.getByRole('textbox', { name: 'Name' })

    await expect.element(nameInput).toHaveValue('Alam')
    await userEvent.fill(nameInput, 'Alam RPL')
    await userEvent.click(screen.getByRole('button', { name: 'Adventurer' }).nth(0))
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await vi.waitFor(() => {
      expect(updateCurrentUserProfile).toHaveBeenCalledWith({
        name: 'Alam RPL',
        avatar: 'preset:adventurer',
      })
    })
    await expect.element(screen.getByRole('status')).toHaveTextContent('Profile updated successfully.')
  })
})
