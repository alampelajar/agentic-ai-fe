import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { useTranslation } from "react-i18next";
import { requestRegisterOtp, resendRegisterOtp, verifyRegisterOtp } from "@/lib/api-email-otp";
import { EmailOtpStep } from "@/features/auth/email-otp/email-otp-step";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";

const formSchema = z
  .object({
    name: z
      .string()
      .min(1, "Please enter your name.")
      .min(2, "Name must be at least 2 characters long."),

    email: z.email({
      error: (iss) =>
        iss.input === "" ? "Please enter your email." : undefined,
    }),

    password: z
      .string()
      .min(1, "Please enter your password.")
      .min(8, "Password must be at least 8 characters long."),

    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  // After the form is accepted a code is e-mailed; the account exists only once it is entered.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      const email = data.email.trim();

      await requestRegisterOtp({
        name: data.name.trim(),
        email,
        password: data.password,
      });

      setPendingEmail(email);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyCode(code: string) {
    if (!pendingEmail) return;

    await verifyRegisterOtp(pendingEmail, code);

    toast.success("Account created successfully!", {
      description: `Account created for ${pendingEmail}.`,
    });

    form.reset();
    window.location.href = "/sign-in";
  }

  if (pendingEmail) {
    return (
      <EmailOtpStep
        email={pendingEmail}
        verifyLabel={t("emailOtp.createAccount")}
        onVerify={verifyCode}
        onResend={async () => {
          await resendRegisterOtp(pendingEmail);
        }}
        onBack={() => setPendingEmail(null)}
      />
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("grid gap-3.5", className)}
        {...props}
      >
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>

              <FormControl>
                <Input
                  placeholder="Your name"
                  autoComplete="name"
                  disabled={isLoading}
                  className="h-10 rounded-xl border-border/70 bg-background/50 px-3.5 transition-all focus-visible:ring-1"
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>

              <FormControl>
                <Input
                  placeholder="name@example.com"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  className="h-10 rounded-xl border-border/70 bg-background/50 px-3.5 transition-all focus-visible:ring-1"
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>

              <FormControl>
                <PasswordInput
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="h-10 rounded-xl border-border/70 bg-background/50"
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm Password */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>

              <FormControl>
                <PasswordInput
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="h-10 rounded-xl border-border/70 bg-background/50"
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Create Account */}
        <Button
          type="submit"
          disabled={isLoading}
          className="mt-1 h-10 w-full rounded-xl font-medium shadow-lg shadow-primary/10 transition-all hover:shadow-primary/20"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}

          {isLoading ? "Creating account..." : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}
