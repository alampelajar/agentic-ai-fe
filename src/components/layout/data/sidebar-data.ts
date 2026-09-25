import {
  LayoutDashboard,
  Monitor,
  ListTodo,
  HelpCircle,
  Bell,
  Package,
  Palette,
  Settings,
  Wrench,
  Command,
  GalleryVerticalEnd,
  AudioWaveform,
  Bot,
  UserCog,
} from "lucide-react";

import { type SidebarData } from "../types";

export const sidebarData: SidebarData = {
  /* =====================================================
     USER
  ===================================================== */

  user: {
    name: "satnaing",
    email: "satnaingdev@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },

  /* =====================================================
     ACCOUNTS / TEAMS
  ===================================================== */

  teams: [
    {
      name: "agenticAI",
      logo: Command,
      plan: "aiSmart",
    },

    {
      name: "acmeInc",
      logo: GalleryVerticalEnd,
      plan: "enterprise",
    },

    {
      name: "acmeCorp",
      logo: AudioWaveform,
      plan: "startup",
    },
  ],

  /* =====================================================
     NAVIGATION
  ===================================================== */

  navGroups: [
    /* ===================================================
       CHAT
    =================================================== */

    {
      title: "CHAT",

      items: [
        {
          title: "Agentic",
          url: "/ai",
          icon: Bot,
        },
      ],
    },

    /* ===================================================
       AI WORKSPACE
    =================================================== */

    {
      title: "AI Workspace",

      items: [
        /* AI Overview */

        {
          title: "aiOverview",
          url: "/overview",
          icon: LayoutDashboard,
        },

        /* Agents */

        {
          title: "agents",
          url: "/users",
          icon: Bot,
        },

        /* Tasks */

        {
          title: "tasks",
          url: "/tasks",
          icon: ListTodo,
        },

        /* Tools */

        {
          title: "tools",
          url: "/apps",
          icon: Package,
        },
      ],
    },

    /* ===================================================
       SETTINGS
    =================================================== */

    {
      title: "Settings",

      items: [
        /* Settings submenu */

        {
          title: "settings",
          icon: Settings,

          items: [
            {
              title: "account",
              url: "/settings/account",
              icon: Wrench,
            },

            {
              title: "appearance",
              url: "/settings/appearance",
              icon: Palette,
            },

            {
              title: "notifications",
              url: "/settings/notifications",
              icon: Bell,
            },

            {
              title: "display",
              url: "/settings/display",
              icon: Monitor,
            },
          ],
        },
      ],
    },
  ],
};
