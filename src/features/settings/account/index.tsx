import { useTranslation } from "react-i18next";
import { ContentSection } from "../components/content-section";
import { AccountForm } from "./account-form";

export function SettingsAccount() {
  const { t } = useTranslation();

  return (
    <ContentSection
      title={t("settingsPage.account.title")}
      desc={t("settingsPage.account.subtitle")}
    >
      <AccountForm />
    </ContentSection>
  );
}
