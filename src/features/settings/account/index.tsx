import { useTranslation } from "react-i18next";
import { ContentSection } from "../components/content-section";
import { AccountForm } from "./account-form";
import { ChangePasswordCard } from "./change-password-card";
import { DeleteAccountCard } from "./delete-account-card";

export function SettingsAccount() {
  const { t } = useTranslation();

  return (
    <ContentSection
      title={t("settingsPage.account.title")}
      desc={t("settingsPage.account.subtitle")}
    >
      <div className="space-y-8">
        <AccountForm />
        <ChangePasswordCard />
        <DeleteAccountCard />
      </div>
    </ContentSection>
  );
}
