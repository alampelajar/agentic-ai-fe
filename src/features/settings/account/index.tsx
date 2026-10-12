import { useTranslation } from "react-i18next";
import { ContentSection } from "../components/content-section";
import { ChangePasswordCard } from "./change-password-card";
import { DeleteAccountCard } from "./delete-account-card";

export function SettingsAccount() {
  const { t, i18n } = useTranslation();
  const isIndonesian = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith("id");

  return (
    <ContentSection
      title={t("settingsPage.account.title")}
      desc={t("settingsPage.account.subtitle")}
    >
      <div className="w-full min-w-0 space-y-6">
        <div className="rounded-xl border bg-muted/20 px-5 py-4">
          <h3 className="font-semibold">
            {isIndonesian ? "Keamanan akun" : "Account security"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {isIndonesian
              ? "Perbarui password atau kelola penghapusan akun dari halaman ini."
              : "Update your password or manage account deletion from this page."}
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-2">
          <ChangePasswordCard />
          <DeleteAccountCard />
        </div>
      </div>
    </ContentSection>
  );
}
