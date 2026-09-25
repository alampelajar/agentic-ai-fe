import * as React from "react";
import { ChevronsUpDown, Check, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { type SidebarData } from "./types";

type TeamSwitcherProps = {
  teams: SidebarData["teams"];
};

export function TeamSwitcher({ teams }: TeamSwitcherProps) {
  const { isMobile } = useSidebar();

  const [activeTeam, setActiveTeam] = React.useState(teams[0]);

  if (!activeTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="
                data-[state=open]:bg-sidebar-accent
                data-[state=open]:text-sidebar-accent-foreground
              "
            >
              {/* Account Icon */}
              <div
                className="
                  flex aspect-square size-8 items-center
                  justify-center rounded-lg
                  bg-sidebar-primary
                  text-sidebar-primary-foreground
                "
              >
                {activeTeam.logo ? (
                  <activeTeam.logo className="size-4" />
                ) : (
                  <UserRound className="size-4" />
                )}
              </div>

              {/* Account Name */}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeTeam.name}
                </span>

                <span className="truncate text-xs text-muted-foreground">
                  {activeTeam.plan}
                </span>
              </div>

              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {/* Header */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch account
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Accounts */}
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className="gap-2 p-2"
              >
                <div
                  className="
                    flex size-6 items-center
                    justify-center rounded-md
                    border bg-background
                  "
                >
                  {team.logo ? (
                    <team.logo className="size-4" />
                  ) : (
                    <UserRound className="size-4" />
                  )}
                </div>

                <span className="flex-1 truncate">{team.name}</span>

                {activeTeam.name === team.name && <Check className="size-4" />}

                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
