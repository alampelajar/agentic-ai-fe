import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

function FeedbackPage() {
  const { t } = useTranslation();
  return <main className="mx-auto max-w-5xl space-y-6 p-6"><h1 className="text-2xl font-semibold">{t("feedback.title")}</h1><p className="text-muted-foreground">{t("feedback.subtitle")}</p></main>;
}

export const Route = createFileRoute("/_authenticated/feedback")({ component: FeedbackPage });
