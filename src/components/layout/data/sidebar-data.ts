
import {
  Globe,
  LayoutDashboard,
  Monitor,
  Puzzle,
  Bell,
  Palette,
  Settings,
  Wrench,
  UserRound,
  Command,
  GalleryVerticalEnd,
  AudioWaveform,
  MessageSquareText,
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
      title: "Website",
      items: [
        {
          title: "aiOverview",
          url: "/overview",
          icon: LayoutDashboard,
        },
        {
          title: "sitesMenu",
          url: "/sites",
          icon: Globe,
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
            {
              title: "integrationsMenu",
              url: "/settings/integrations",
              icon: Puzzle,
            },
          ],
        },
        { title: "feedback", url: "/feedback", icon: MessageSquareText },
      ],
    },
  ],
};
