
import {
  LayoutDashboard,
  Monitor,
  ListTodo,
  Bell,
  Package,
  Palette,
  Settings,
  Wrench,
  UserRound,
  Command,
  GalleryVerticalEnd,
  AudioWaveform,
  Bot,
  CreditCard,
} from "lucide-react";

import { type SidebarData } from "../types";

export const sidebarData: SidebarData = {
  user: {
    name: "satnaing",
    email: "satnaingdev@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
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
  navGroups: [
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
    {
      title: "AI Workspace",
      items: [
        {
          title: "aiOverview",
          url: "/overview",
          icon: LayoutDashboard,
        },
        {
          title: "agents",
          url: "/users",
          icon: Bot,
        },
        {
          title: "tasks",
          url: "/tasks",
          icon: ListTodo,
        },
        {
          title: "appsMenu",
          url: "/apps",
          icon: Package,
        },
        {
          title: "Subscription & Premium",
          url: "/subscription-premium",
          icon: CreditCard,
        },
      ],
    },
    {
      title: "Settings",
      items: [
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
              title: "profile",
              url: "/profile",
              icon: UserRound,
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
