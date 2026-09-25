import { useTranslation } from "react-i18next";
import { ContentSection } from "../components/content-section";
import { NotificationsForm } from "./notifications-form";

export function SettingsNotifications() {
  const { t } = useTranslation();
  return (
    <ContentSection title={t("settingsPage.notifications.title")} desc={t("settingsPage.notifications.subtitle")}>
      <NotificationsForm />
    </ContentSection>
  );
}
