import { Link, useSearch } from "@tanstack/react-router";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AuthLayout } from "../auth-layout";
import { UserAuthForm } from "./components/user-auth-form";

export function SignIn() {
  const { redirect } = useSearch({
    from: "/(auth)/sign-in",
  });
  const { t } = useTranslation();

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <AuthLayout>
        <div className="w-full">
          <div className="mb-5 flex size-10 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/[0.07]">
            <ShieldAlert className="size-5 text-amber-500" />
          </div>

          <h1 className="text-xl font-semibold tracking-tight">
            {t("authPage.configuration.title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("authPage.configuration.description")}
          </p>

          <div className="mt-5 border-l-2 border-amber-500/50 pl-3 text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              VITE_GOOGLE_CLIENT_ID
            </code>
            <p className="mt-2">{t("authPage.configuration.missingVariable")}</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthLayout>
        <div className="w-full">
          <div className="mb-8">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("authPage.signIn.eyebrow")}
            </p>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
              {t("authPage.signIn.title")}
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("authPage.signIn.description")}
            </p>
          </div>

          <UserAuthForm redirectTo={redirect} />

          <div className="mt-8 border-t border-white/[0.09] pt-5">
            <p className="text-sm text-muted-foreground">
              {t("authPage.signIn.noAccount")}{" "}
              <Link
                to="/sign-up"
                className="font-medium text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-primary hover:text-primary"
              >
                {t("authPage.signIn.createAccount")}
              </Link>
            </p>
          </div>
        </div>
      </AuthLayout>
    </GoogleOAuthProvider>
  );
}
