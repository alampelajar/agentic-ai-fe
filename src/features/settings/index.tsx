import { Outlet } from "@tanstack/react-router";

import { Separator } from "@/components/ui/separator";
import { Main } from "@/components/layout/main";

export function Settings() {
  return (
    <Main fixed>
      {/* =====================================================
          SETTINGS HEADER
      ===================================================== */}

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Settings
        </h1>

        <p className="text-muted-foreground">
          Kelola konfigurasi Agentic AI, akun, dan preferensi workspace.
        </p>
      </div>

      <Separator className="my-4 lg:my-6" />

      {/* =====================================================
          SETTINGS CONTENT
      ===================================================== */}

      <div className="min-w-0 flex-1 overflow-y-auto pb-8">
        <Outlet />
      </div>
    </Main>
  );
}
