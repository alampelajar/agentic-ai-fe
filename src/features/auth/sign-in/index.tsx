import { Link, useSearch } from "@tanstack/react-router";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";

import { AuthLayout } from "../auth-layout";
import { UserAuthForm } from "./components/user-auth-form";

export function SignIn() {
  const { redirect } = useSearch({
    from: "/(auth)/sign-in",
  });

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <AuthLayout>
        <div className="w-full rounded-2xl border border-destructive/20 bg-card p-6 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-destructive/10">
              <ShieldCheck className="size-5 text-destructive" />
            </div>

            <h1 className="text-lg font-semibold">Configuration Error</h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Google SSO belum dikonfigurasi.
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-destructive">
            Variable{" "}
            <code className="rounded bg-background px-1.5 py-0.5">
              VITE_GOOGLE_CLIENT_ID
            </code>{" "}
            tidak ditemukan.
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthLayout>
        <div className="w-full">
          {/* Mobile brand */}
          <div className="mb-4 flex flex-col items-center text-center lg:hidden">
            <Sparkles className="mb-1.5 size-5 text-primary" />

            <h1 className="text-lg font-bold tracking-tight">
              agentic
              <span className="text-primary">AI</span>
            </h1>

            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Autonomous AI Workspace
            </p>
          </div>

          {/* Login card */}
          <div className="rounded-2xl border border-white/10 bg-[#080c16] p-5 shadow-xl sm:p-6">
            {/* Header */}
            <div className="mb-4 text-center">
              <div className="mx-auto mb-2.5 flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="size-4 text-primary" />
              </div>

              <h2 className="text-lg font-semibold tracking-tight">
                Welcome back
              </h2>

              <p className="mx-auto mt-1 max-w-xs text-xs leading-4.5 text-muted-foreground">
                Sign in untuk melanjutkan ke workspace AI kamu.
              </p>
            </div>

            {/* Login form */}
            <UserAuthForm redirectTo={redirect} />

            {/* Create account */}
            <div className="mt-4 border-t border-white/10 pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Don't have an account?
              </p>

              <Link
                to="/sign-up"
                className="mt-1 inline-flex cursor-pointer items-center justify-center text-sm font-medium text-white transition-colors hover:text-primary"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </AuthLayout>
    </GoogleOAuthProvider>
  );
}
