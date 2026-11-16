import * as React from 'react'
import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/assets/logo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation()

  return (
    <Sidebar collapsible='icon' variant='sidebar' {...props}>
      {/* =====================================================
          LOGO
      ===================================================== */}

      <SidebarHeader>
        <Link
          to='/sites'
          aria-label={t('sidebar.openAiPage')}
          className='group flex h-14 items-center gap-2 rounded-md px-3 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none active:scale-[0.98]'
        >
          <span className='flex shrink-0 transition-transform duration-200 group-hover:scale-110 group-active:scale-95'>
            <Logo className='size-7' />
          </span>

          <div className='grid flex-1 text-start leading-tight'>
            <span className='truncate text-sm font-semibold tracking-tight'>
              {/* design-system-ignore: the product name stays the same in every language */}
              AGENTIC<span className='text-primary'>AI</span>
            </span>

            <span className='truncate text-xs text-muted-foreground'>
              {t('sidebar.smartAgentic')}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <SidebarContent>
        {/* The website builder first, then Settings (WEBSITE-BUILDER.md, section 20). */}
        {sidebarData.navGroups.map((group) => (
          <Fragment key={group.title}>
            <NavGroup title={group.title} items={group.items} />
          </Fragment>
        ))}
      </SidebarContent>

      {/* =====================================================
          USER
      ===================================================== */}

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      {/* =====================================================
          SIDEBAR RAIL
      ===================================================== */}

      <SidebarRail />
    </Sidebar>
  )
}
