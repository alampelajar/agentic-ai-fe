import { useTranslation } from "react-i18next";
import { Main } from "@/components/layout/main";
import { ContentSection } from "@/features/settings/components/content-section";
import { AccountForm } from "@/features/settings/account/account-form";

export function ProfilePage() {
  const { i18n } = useTranslation();
  const isIndonesian = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith("id");

  return (
    <Main fixed fluid>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {isIndonesian ? "Profil" : "Profile"}
        </h1>
        <p className="text-muted-foreground">
          {isIndonesian
            ? "Kelola nama dan foto profil kamu."
            : "Manage your name and profile photo."}
        </p>
      </div>
      <div className="my-4 flex min-h-0 min-w-0 flex-1 flex-col">
        <ContentSection
          title={isIndonesian ? "Informasi profil" : "Profile information"}
          desc={isIndonesian ? "Perbarui nama dan foto profil." : "Update your name and profile photo."}
        >
          <div className="w-full min-w-0">
            <AccountForm />
          </div>
        </ContentSection>
      </div>
    </Main>
  );
}
