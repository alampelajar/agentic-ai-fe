import { useTranslation } from "react-i18next";
import { ContentSection } from "../components/content-section";
import { DisplayForm } from "./display-form";

export function SettingsDisplay() {
  const { t } = useTranslation();
  return (
    <ContentSection title={t("settingsPage.display.title")} desc={t("settingsPage.display.subtitle")}>
      <DisplayForm />
    </ContentSection>
  );
}
