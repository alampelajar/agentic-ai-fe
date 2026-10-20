import { useEffect, useState, type ReactNode } from "react";
import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { getCookie } from "@/lib/cookies";
import { cn } from "@/lib/utils";

import { LayoutProvider } from "@/context/layout-provider";
import { SearchProvider } from "@/context/search-provider";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import { ConfigDrawer } from "@/components/config-drawer";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { SkipToMain } from "@/components/skip-to-main";

import { AgentTasksProvider } from "@/features/ai/components/agent-tasks-provider";

import { getCurrentUser } from "@/lib/api-auth";

import i18n from "@/i18n";

function LanguageFlag({ language }: { language: "id" | "en" }) {
  if (language === "id") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 60 40"
        className="h-4 w-6 shrink-0 overflow-hidden rounded-[3px] border border-border/70"
      >
        <rect width="60" height="20" fill="#dc2626" />
        <rect y="20" width="60" height="20" fill="#ffffff" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 60 40"
      className="h-4 w-6 shrink-0 overflow-hidden rounded-[3px] border border-border/70"
    >
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#ffffff" strokeWidth="10" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#c8102e" strokeWidth="4" />
      <path d="M30 0V40M0 20H60" stroke="#ffffff" strokeWidth="15" />
      <path d="M30 0V40M0 20H60" stroke="#c8102e" strokeWidth="8" />
    </svg>
  );
}

const API_URL = "http://localhost:8081";

export function AuthenticatedLayout({ children }: { children?: ReactNode }) {
  const defaultOpen = getCookie("sidebar_state") !== "false";

  const { i18n: currentI18n } = useTranslation();

  const currentLanguage = currentI18n.language;

  const isIndonesian = currentLanguage.startsWith("id");
  const isEnglish = currentLanguage.startsWith("en");

  // ============================================================
  // MAINTENANCE STATE
  // ============================================================

  const [maintenance, setMaintenance] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] =
    useState(true);

  // ============================================================
  // CHECK MAINTENANCE STATUS
  // ============================================================

  const checkMaintenance = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/system/maintenance`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        console.error(
          "Gagal mengecek maintenance mode:",
          data?.message,
        );

        return;
      }

      setMaintenance(data.maintenance === true);
    } catch (error) {
      console.error(
        "Gagal menghubungi server maintenance:",
        error,
      );
    } finally {
      setCheckingMaintenance(false);
    }
  };

  // ============================================================
  // MAINTENANCE INITIAL CHECK
  // ============================================================

  useEffect(() => {
    checkMaintenance();
  }, []);

  // ============================================================
  // CHECK MAINTENANCE PERIODICALLY
  // ============================================================

  useEffect(() => {
    const interval = window.setInterval(() => {
      checkMaintenance();
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // ============================================================
  // GET CURRENT USER
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        if (cancelled) return;

        await getCurrentUser();
      } catch (error) {
        console.error(
          "Gagal mengambil profile user:",
          error,
        );
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // LANGUAGE
  // ============================================================

  const changeLanguage = (language: "id" | "en") => {
    if (currentLanguage.startsWith(language)) return;

    i18n.changeLanguage(language);
  };

  // ============================================================
  // CHECKING MAINTENANCE
  // ============================================================

  if (checkingMaintenance) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />

          <p className="text-sm text-muted-foreground">
            Checking system status...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAINTENANCE PAGE
  // ============================================================

  if (maintenance) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md text-center">

          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-10 w-10 text-amber-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 3.58a6.5 6.5 0 0 0 8.99 8.99l-3.13 3.13a2 2 0 0 1-2.83 0l-6.16-6.16a2 2 0 0 1 0-2.83l3.13-3.13Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.5 9.5 5 5"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.5 17.5 3 21"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Website Sedang Maintenance
          </h1>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Kami sedang melakukan pemeliharaan sistem.
            Silakan coba kembali beberapa saat lagi.
          </p>

          <div className="mt-8 rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Sistem akan kembali tersedia setelah
              maintenance selesai.
            </p>
          </div>

        </div>
      </div>
    );
  }

  // ============================================================
  // NORMAL WEBSITE
  // ============================================================

  return (
    <SearchProvider>
      <LayoutProvider>
        <AgentTasksProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <SkipToMain />

            {/* ================================
                SIDEBAR
            ================================= */}

            <AppSidebar />

            <SidebarInset
              className={cn(
                "@container/content",
                "has-data-[layout=fixed]:h-svh",
                "peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]",
              )}
            >
              {/* ================================
                  GLOBAL HEADER
              ================================= */}

              <Header fixed>

                {/* Search */}

                <Search className="me-auto" />

                {/* ================================
                    LANGUAGE SWITCHER
                ================================= */}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={
                        isIndonesian
                          ? "Bahasa aktif: Indonesia"
                          : "Current language: English"
                      }
                      className="h-9 gap-2 px-3"
                    >
                      <LanguageFlag language={isIndonesian ? "id" : "en"} />
                      <span className="hidden text-sm sm:inline">
                        {isIndonesian ? "Indonesia" : "English"}
                      </span>
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuLabel>Language / Bahasa</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onSelect={() => changeLanguage("id")}
                      className={cn(
                        "gap-3 py-2",
                        isIndonesian && "bg-accent/70",
                      )}
                      aria-current={isIndonesian ? "true" : undefined}
                    >
                      <LanguageFlag language="id" />
                      <span>Bahasa Indonesia</span>
                      {isIndonesian && (
                        <Check className="ms-auto size-4 text-primary" />
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onSelect={() => changeLanguage("en")}
                      className={cn(
                        "gap-3 py-2",
                        isEnglish && "bg-accent/70",
                      )}
                      aria-current={isEnglish ? "true" : undefined}
                    >
                      <LanguageFlag language="en" />
                      <span>English</span>
                      {isEnglish && (
                        <Check className="ms-auto size-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Theme */}

                <ThemeSwitch />

                {/* Settings */}

                <ConfigDrawer />

                {/* Profile */}

                <ProfileDropdown />

              </Header>

              {/* ================================
                  PAGE CONTENT
              ================================= */}

              {children ?? <Outlet />}

            </SidebarInset>
          </SidebarProvider>
        </AgentTasksProvider>
      </LayoutProvider>
    </SearchProvider>
  );
}