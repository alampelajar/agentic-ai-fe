import { type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { Badge } from "../ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import {
  type NavCollapsible,
  type NavItem,
  type NavLink,
  type NavGroup as NavGroupProps,
} from "./types";

/* =========================================================
   NAV GROUP
========================================================= */

export function NavGroup({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar();

  const href = useLocation({
    select: (location) => location.href,
  });

  const { t } = useTranslation();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t(`navigation.groups.${title}`)}</SidebarGroupLabel>

      <SidebarMenu>
        {items.map((item) => {
          const key = `${item.title}-${item.url}`;

          /* =================================================
             NORMAL MENU
          ================================================= */

          if (!item.items) {
            return <SidebarMenuLink key={key} item={item} href={href} t={t} />;
          }

          /* =================================================
             COLLAPSED SIDEBAR
          ================================================= */

          if (state === "collapsed" && !isMobile) {
            return (
              <SidebarMenuCollapsedDropdown
                key={key}
                item={item}
                href={href}
                t={t}
              />
            );
          }

          /* =================================================
             NORMAL COLLAPSIBLE MENU
          ================================================= */

          return (
            <SidebarMenuCollapsible key={key} item={item} href={href} t={t} />
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

/* =========================================================
   NAV BADGE
========================================================= */

function NavBadge({ children }: { children: ReactNode }) {
  return <Badge className="rounded-full px-1 py-0 text-xs">{children}</Badge>;
}

/* =========================================================
   NORMAL SIDEBAR LINK
========================================================= */

function SidebarMenuLink({
  item,
  href,
  t,
}: {
  item: NavLink;
  href: string;
  t: (key: string) => string;
}) {
  const { setOpenMobile } = useSidebar();

  const isActive = checkIsActive(href, item);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.title)}>
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {/* Icon */}
          {item.icon && <item.icon />}

          {/* Label */}
          <span>{t(item.title)}</span>

          {/* Badge */}
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/* =========================================================
   COLLAPSIBLE SIDEBAR MENU
========================================================= */

function SidebarMenuCollapsible({
  item,
  href,
  t,
}: {
  item: NavCollapsible;
  href: string;
  t: (key: string) => string;
}) {
  const { setOpenMobile } = useSidebar();

  const isActive = checkIsActive(href, item, true);

  return (
    <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
      <SidebarMenuItem>
        {/* =================================================
            COLLAPSIBLE HEADER
        ================================================= */}

        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={t(item.title)}>
            {/* Icon */}
            {item.icon && <item.icon />}

            {/* Label */}
            <span>{t(item.title)}</span>

            {/* Badge */}
            {item.badge && <NavBadge>{item.badge}</NavBadge>}

            {/* Arrow */}
            <ChevronRight
              className="
                ms-auto
                transition-transform
                duration-200
                group-data-[state=open]/collapsible:rotate-90
                rtl:rotate-180
              "
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        {/* =================================================
            SUB MENU
        ================================================= */}

        <CollapsibleContent className="CollapsibleContent">
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={`${subItem.title}-${subItem.url}`}>
                <SidebarMenuSubButton
                  asChild
                  isActive={checkIsActive(href, subItem)}
                >
                  <Link to={subItem.url} onClick={() => setOpenMobile(false)}>
                    {/* Icon */}
                    {subItem.icon && <subItem.icon />}

                    {/* Label */}
                    <span>{t(subItem.title)}</span>

                    {/* Badge */}
                    {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/* =========================================================
   COLLAPSED SIDEBAR DROPDOWN
========================================================= */

function SidebarMenuCollapsedDropdown({
  item,
  href,
  t,
}: {
  item: NavCollapsible;
  href: string;
  t: (key: string) => string;
}) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        {/* =================================================
            DROPDOWN TRIGGER
        ================================================= */}

        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={t(item.title)}
            isActive={checkIsActive(href, item)}
          >
            {/* Icon */}
            {item.icon && <item.icon />}

            {/* Label */}
            <span>{t(item.title)}</span>

            {/* Badge */}
            {item.badge && <NavBadge>{item.badge}</NavBadge>}

            {/* Arrow */}
            <ChevronRight
              className="
                ms-auto
                transition-transform
                duration-200
                group-data-[state=open]/collapsible:rotate-90
              "
            />
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        {/* =================================================
            DROPDOWN CONTENT
        ================================================= */}

        <DropdownMenuContent side="right" align="start" sideOffset={4}>
          {/* Dropdown title */}
          <DropdownMenuLabel>
            {t(item.title)}

            {item.badge ? ` (${item.badge})` : ""}
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Sub items */}
          {item.items.map((sub) => (
            <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
              <Link
                to={sub.url}
                className={checkIsActive(href, sub) ? "bg-secondary" : ""}
              >
                {/* Icon */}
                {sub.icon && <sub.icon />}

                {/* Label */}
                <span className="max-w-52 text-wrap">{t(sub.title)}</span>

                {/* Badge */}
                {sub.badge && (
                  <span className="ms-auto text-xs">{sub.badge}</span>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

/* =========================================================
   CHECK ACTIVE MENU
========================================================= */

function checkIsActive(href: string, item: NavItem, mainNav = false) {
  return (
    /* Exact URL */
    href === item.url ||
    /* URL without query */
    href.split("?")[0] === item.url ||
    /* Sub menu active */
    !!item?.items?.filter((i) => i.url === href).length ||
    /* Main navigation */
    (mainNav &&
      href.split("/")[1] !== "" &&
      href.split("/")[1] === item?.url?.split("/")[1])
  );
}
