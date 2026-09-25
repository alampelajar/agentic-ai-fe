import { Logo } from "@/assets/logo";
import { ArrowUpRight, Bot, CheckCircle2, Sparkles } from "lucide-react";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative h-svh overflow-hidden bg-[#05070d] text-white">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Header */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-2.5">
          <Logo className="size-7" />

          <span className="text-lg font-semibold tracking-tight">
            agentic<span className="text-primary">AI</span>
          </span>
        </div>

        <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          All systems operational
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 grid h-[calc(100svh-4rem)] min-h-0 items-center lg:grid-cols-2">
        {/* Left */}
        <section className="hidden min-h-0 items-center px-10 lg:flex xl:px-20">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-zinc-400">
              <Sparkles className="size-3.5 text-primary" />
              Autonomous AI Workspace
            </div>

            <h1 className="text-5xl font-semibold leading-[1] tracking-[-0.045em] xl:text-6xl">
              Let AI
              <br />
              <span className="text-zinc-500">do the work.</span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-6 text-zinc-500">
              Build intelligent agents, delegate tasks, and automate complex
              workflows from one powerful workspace.
            </p>

            {/* Agent preview */}
            <div className="mt-7 max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                    <Bot className="size-4 text-zinc-300" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Research Agent
                    </p>

                    <p className="text-[11px] text-zinc-600">Autonomous task</p>
                  </div>
                </div>

                <span className="flex items-center gap-1.5 text-[11px] text-emerald-500">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Running
                </span>
              </div>

              <div className="space-y-2.5 pt-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  <span className="text-xs text-zinc-500">
                    Analyze project requirements
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  <span className="text-xs text-zinc-500">
                    Generate implementation plan
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex size-3.5 items-center justify-center">
                    <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  </span>

                  <span className="text-xs text-zinc-300">
                    Execute assigned task...
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-6">
              <div>
                <p className="text-base font-semibold">24/7</p>
                <p className="text-[10px] text-zinc-600">Autonomous</p>
              </div>

              <div className="h-7 w-px bg-white/10" />

              <div>
                <p className="text-base font-semibold">AI Agents</p>
                <p className="text-[10px] text-zinc-600">
                  Built for your workflow
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right */}
        <section className="flex min-h-0 h-full items-center justify-center px-5 py-3 sm:px-8 lg:justify-start lg:px-10 xl:px-20">
          <div className="w-full max-w-[390px]">{children}</div>
        </section>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-3 left-6 right-6 z-20 flex items-center justify-between text-[10px] text-zinc-600 sm:left-10 sm:right-10">
        <span>© {new Date().getFullYear()} agenticAI</span>

        <div className="hidden items-center gap-4 sm:flex">
          <span className="flex items-center gap-1">
            Secure
            <ArrowUpRight className="size-3" />
          </span>

          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </footer>
    </div>
  );
}
