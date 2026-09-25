import { useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

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

const API_URL = "http://localhost:8080";

export function AuthenticatedLayout() {
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

                <div className="flex items-center gap-1 rounded-lg border bg-background p-1">

                  {/* Indonesia */}

                  <button
                    type="button"
                    onClick={() => changeLanguage("id")}
                    aria-label="Bahasa Indonesia"
                    aria-pressed={isIndonesian}
                    className={cn(
                      "flex h-7 w-9 items-center justify-center rounded-md",
                      "text-xl transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2",
                      "focus-visible:ring-primary/50",
                      isIndonesian
                        ? "bg-primary/10 shadow-sm ring-1 ring-primary/20"
                        : "opacity-50 hover:bg-muted hover:opacity-100",
                    )}
                  >
                    🇮🇩
                  </button>

                  {/* English */}

                  <button
                    type="button"
                    onClick={() => changeLanguage("en")}
                    aria-label="English"
                    aria-pressed={isEnglish}
                    className={cn(
                      "flex h-7 w-9 items-center justify-center rounded-md",
                      "text-xl transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2",
                      "focus-visible:ring-primary/50",
                      isEnglish
                        ? "bg-primary/10 shadow-sm ring-1 ring-primary/20"
                        : "opacity-50 hover:bg-muted hover:opacity-100",
                    )}
                  >
                    🇬🇧
                  </button>

                </div>

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

              <Outlet />

            </SidebarInset>
          </SidebarProvider>
        </AgentTasksProvider>
      </LayoutProvider>
    </SearchProvider>
  );
}