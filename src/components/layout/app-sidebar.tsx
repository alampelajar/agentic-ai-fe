import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { Logo } from "@/assets/logo";

import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";
import { sidebarData } from "./data/sidebar-data";

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      {/* =====================================================
          LOGO
      ===================================================== */}

      <SidebarHeader>
        <div className="flex h-14 items-center gap-2 px-3">
          <Logo className="size-7 shrink-0" />

          <div className="grid flex-1 text-start leading-tight">
            <span className="truncate text-[13px] font-semibold tracking-tight">
              AGENTIC<span className="text-primary">AI</span>
            </span>

            <span className="truncate text-[11px] text-muted-foreground">
              {t('sidebar.smartAgentic')}
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <SidebarContent>
        {sidebarData.navGroups.map((group) => (
          <NavGroup
            key={group.title}
            title={group.title}
            items={group.items}
          />
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
  );
}