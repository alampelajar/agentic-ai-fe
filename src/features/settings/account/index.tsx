import { useTranslation } from "react-i18next";
import { ContentSection } from "../components/content-section";
import { ChangePasswordCard } from "./change-password-card";
import { DeleteAccountCard } from "./delete-account-card";

export function SettingsAccount() {
  const { t } = useTranslation();

  return (
    <ContentSection
      title={t("settingsPage.account.title")}
      desc={t("settingsPage.account.subtitle")}
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Keamanan akun</h2>
          <p className="text-sm text-muted-foreground">
            Kelola password dan tindakan permanen untuk akun kamu di sini.
          </p>
        </div>
        <ChangePasswordCard />
        <DeleteAccountCard />
      </div>
    </ContentSection>
  );
}
