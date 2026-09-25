import { Link } from '@tanstack/react-router'
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import useDialogState from '@/hooks/use-dialog-state'
import { useAuthStore } from '@/stores/auth-store'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

import { SignOutDialog } from '@/components/sign-out-dialog'

export function NavUser() {
  const { isMobile } = useSidebar()
  const [open, setOpen] = useDialogState()
  const { t } = useTranslation()

  const user = useAuthStore((state) => state.auth.user)

  const name = user?.name || 'User'
  const email = user?.email || 'No email'
  const avatar = user?.avatar || ''

  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                {/* Avatar */}
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage
                    src={avatar}
                    alt={name}
                  />

                  <AvatarFallback className='rounded-lg'>
                    {initials || 'U'}
                  </AvatarFallback>
                </Avatar>

                {/* User information */}
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-semibold'>
                    {name}
                  </span>

                  <span className='truncate text-xs'>
                    {email}
                  </span>
                </div>

                <ChevronsUpDown className='ms-auto size-4' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={4}
            >
              {/* User information */}
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-1 py-1.5 text-start text-sm'>
                  <Avatar className='h-8 w-8 rounded-lg'>
                    <AvatarImage
                      src={avatar}
                      alt={name}
                    />

                    <AvatarFallback className='rounded-lg'>
                      {initials || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className='grid flex-1 text-start text-sm leading-tight'>
                    <span className='truncate font-semibold'>
                      {name}
                    </span>

                    <span className='truncate text-xs'>
                      {email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Upgrade */}
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <Sparkles />
                  {t('navigation.upgradeToPro')}
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              {/* Menu */}
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to='/settings/account'>
                    <BadgeCheck />
                    {t('account')}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to='/settings'>
                    <CreditCard />
                    {t('navigation.billing')}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to='/settings/notifications'>
                    <Bell />
                    {t('notifications')}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              {/* Logout */}
              <DropdownMenuItem
                variant='destructive'
                onClick={() => setOpen(true)}
              >
                <LogOut />
                {t('navigation.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog
        open={!!open}
        onOpenChange={setOpen}
      />
    </>
  )
}