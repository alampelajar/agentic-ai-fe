import { useTranslation } from "react-i18next";
import { ContentSection } from "@/features/settings/components/content-section";
import { AccountForm } from "@/features/settings/account/account-form";

export function ProfilePage() {
  const { i18n } = useTranslation();
  const isIndonesian = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith("id");

  return (
    <ContentSection
      title={isIndonesian ? "Profil" : "Profile"}
      desc={isIndonesian ? "Kelola nama dan foto profil kamu." : "Manage your name and profile photo."}
    >
      <div className="w-full min-w-0">
        <AccountForm />
      </div>
    </ContentSection>
  );
}
