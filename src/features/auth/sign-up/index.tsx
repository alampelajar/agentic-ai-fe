import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CheckCircle2,
  UserPlus,
} from "lucide-react";

import { AuthLayout } from "../auth-layout";
import { SignUpForm } from "./components/sign-up-form";

export function SignUp() {
  return (
    <AuthLayout>
      <div className="w-full">
        {/* Sign Up Card */}
        <div className="rounded-2xl border border-white/10 bg-[#080c16] p-5 shadow-xl sm:p-6">
          {/* Header */}
          <div className="mb-4 text-center">
            <div className="mx-auto mb-2.5 flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="size-4 text-primary" />
            </div>

            <h2 className="text-lg font-semibold tracking-tight">
              Create your account
            </h2>

            <p className="mx-auto mt-1 max-w-xs text-xs leading-4.5 text-muted-foreground">
              Create your account and start building your autonomous AI
              workspace.
            </p>
          </div>

          {/* Existing Sign Up Form */}
          <SignUpForm />

          {/* Sign In */}
          <div className="mt-4 border-t border-white/10 pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?
            </p>

            <Link
              to="/sign-in"
              className="mt-1 inline-flex cursor-pointer items-center justify-center text-sm font-medium text-white transition-colors hover:text-primary"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Small info */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/60">
          <CheckCircle2 className="size-3 text-emerald-500" />
          <span>Secure account creation</span>
        </div>

        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/40">
          <span>Powered by Agentic AI</span>
          <ArrowUpRight className="size-2.5" />
        </div>
      </div>
    </AuthLayout>
  );
}
