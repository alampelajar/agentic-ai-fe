import { Outlet } from "@tanstack/react-router";

import { Separator } from "@/components/ui/separator";
import { Main } from "@/components/layout/main";

export function Settings() {
  return (
    <Main fixed fluid className="gap-0">
      <header className="shrink-0 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Workspace
        </p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Settings
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Kelola akun, keamanan, dan preferensi workspace Agentic AI.
        </p>
      </header>

      <Separator className="my-5 shrink-0" />

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-8">
        <Outlet />
      </div>
    </Main>
  );
}
