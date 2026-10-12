import { useTranslation } from "react-i18next";
import { Main } from "@/components/layout/main";
import { ContentSection } from "@/features/settings/components/content-section";
import { AccountForm } from "@/features/settings/account/account-form";

export function ProfilePage() {
  const { i18n } = useTranslation();
  const isIndonesian = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith("id");

  return (
    <Main fixed fluid className="gap-0">
      <header className="shrink-0 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {isIndonesian ? "Pengaturan" : "Settings"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {isIndonesian ? "Profil" : "Profile"}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {isIndonesian
            ? "Atur bagaimana nama dan foto kamu ditampilkan di Agentic AI."
            : "Manage how your name and photo appear across Agentic AI."}
        </p>
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-8">
        <div className="mt-5 w-full min-w-0">
          <ContentSection
            title={isIndonesian ? "Informasi profil" : "Profile information"}
            desc={isIndonesian ? "Informasi ini digunakan untuk mengenali akun kamu." : "This information is used to identify your account."}
          >
            <AccountForm />
          </ContentSection>
        </div>
      </div>
    </Main>
  );
}
