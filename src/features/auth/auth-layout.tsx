import { Logo } from "@/assets/logo";
import { useTranslation } from "react-i18next";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-svh bg-[#090a0c] text-white">
      <main className="grid min-h-svh lg:grid-cols-[minmax(0,1.04fr)_minmax(420px,0.96fr)]">
        <aside className="hidden min-h-svh flex-col border-r border-white/[0.08] bg-[#0d0f12] px-10 py-9 lg:flex xl:px-16 2xl:px-20">
          <div className="flex items-center gap-2.5">
            <Logo className="size-7 text-white" />
            <span className="text-base font-semibold tracking-tight">
              agentic<span className="text-primary">AI</span>
            </span>
          </div>

          <div className="my-auto max-w-lg py-16">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              {t("authLayout.eyebrow")}
            </p>

            <h1 className="max-w-[12ch] text-4xl font-semibold leading-[1.12] tracking-[-0.04em] xl:text-5xl">
              {t("authLayout.headline")}
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400 xl:text-base">
              {t("authLayout.description")}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.09] pt-5 text-sm text-zinc-400">
              <span>{t("authLayout.features.agents")}</span>
              <span className="text-zinc-700" aria-hidden="true">/</span>
              <span>{t("authLayout.features.tasks")}</span>
              <span className="text-zinc-700" aria-hidden="true">/</span>
              <span>{t("authLayout.features.models")}</span>
            </div>
          </div>

          <p className="text-xs text-zinc-600">
            {t("authLayout.footerNote")}
          </p>
        </aside>

        <section className="flex min-h-svh flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
          <header className="flex h-10 items-center lg:hidden">
            <Logo className="me-2 size-6 text-white" />
            <span className="text-sm font-semibold tracking-tight">
              agentic<span className="text-primary">AI</span>
            </span>
          </header>

          <div className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-[380px]">{children}</div>
          </div>

          <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/[0.07] pt-5 text-xs text-zinc-500 lg:justify-start">
            <span>{t("authLayout.copyright", { year: new Date().getFullYear() })}</span>
            <span>{t("authLayout.privacy")}</span>
            <span>{t("authLayout.terms")}</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
