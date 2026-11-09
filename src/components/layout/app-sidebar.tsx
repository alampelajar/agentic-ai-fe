import * as React from "react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { Logo } from "@/assets/logo";

import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";
import { NavChats } from "./nav-chats";
import { sidebarData } from "./data/sidebar-data";

function NewChatButton() {
  const { t } = useTranslation();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup className="pb-0">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={t("chatHistory.new")}>
            <Link to="/ai" search={{}} onClick={() => setOpenMobile(false)}>
              <Plus />
              <span>{t("chatHistory.new")}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}

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
        <Link
          to="/ai"
          aria-label="Buka halaman AI"
          className="group flex h-14 items-center gap-2 rounded-md px-3 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="flex shrink-0 transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
            <Logo className="size-7" />
          </span>

          <div className="grid flex-1 text-start leading-tight">
            <span className="truncate text-[13px] font-semibold tracking-tight">
              AGENTIC<span className="text-primary">AI</span>
            </span>

            <span className="truncate text-[11px] text-muted-foreground">
              {t('sidebar.smartAgentic')}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <SidebarContent>
        {/* Tombol New + menu AI Workspace di atas, lalu riwayat chat, lalu Settings.
            Grup "CHAT" tetap ada di data untuk palet perintah, tapi tidak dirender di sini. */}
        <NewChatButton />
        {sidebarData.navGroups
          .filter((group) => group.title !== "CHAT")
          .map((group) => (
            <Fragment key={group.title}>
              <NavGroup title={group.title} items={group.items} />
              {group.title === "AI Workspace" && <NavChats />}
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
  );
}