import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Main } from "@/components/layout/main";
import { PageLoading } from "@/components/layout/page-loading";

import { TasksDialogs } from "./components/tasks-dialogs";
import { TasksProvider } from "./components/tasks-provider";
import { TasksTable } from "./components/tasks-table";

export function Tasks() {
  const { t } = useTranslation();

  // ============================================================
  // BACKEND TASKS
  // ============================================================

  // The table is fed by TasksProvider, which loads /api/tasks.

  // ============================================================
  // PAGE LOADING
  // ============================================================

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // ============================================================
  // SKELETON LOADING
  // ============================================================

  if (loading) {
    return <PageLoading />;
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <TasksProvider>
      <Main
        className="
          flex
          min-h-0
          flex-1
          flex-col
          gap-0
          overflow-hidden
        "
      >
        {/* ======================================================
            SCROLLABLE CONTENT
        ====================================================== */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overflow-x-hidden
            pr-1
          "
        >
          {/* ====================================================
              PAGE HEADER
          ==================================================== */}

          <div
            className="
              mb-6
              flex
              flex-wrap
              items-end
              justify-between
              gap-4
            "
          >
            {/* Title */}

            <div>
              {/* AI Badge */}

              <div
                className="
                  mb-2
                  inline-flex
                  items-center
                  rounded-full
                  border
                  border-violet-200
                  bg-violet-50
                  px-3
                  py-1
                  text-xs
                  font-medium
                  text-violet-600
                  dark:border-violet-800
                  dark:bg-violet-950/40
                  dark:text-violet-400
                "
              >
                Agentic AI
              </div>

              {/* Page Title */}

              <h2
                className="
                  text-2xl
                  font-bold
                  tracking-tight
                  sm:text-3xl
                "
              >
                {t("tasksPage.title")}
              </h2>

              {/* Page Description */}

              <p
                className="
                  mt-1
                  text-sm
                  text-muted-foreground
                  sm:text-base
                "
              >
                {t("tasksPage.subtitle")}
              </p>
            </div>
          </div>

          {/* ====================================================
              TASK TABLE
          ==================================================== */}

          <div
            className="
              overflow-hidden
              rounded-xl
              border
              border-border
              bg-card
              shadow-sm
            "
          >
            <TasksTable />
          </div>

          {/* ====================================================
              BOTTOM SPACING
          ==================================================== */}

          <div className="h-8" />
        </div>
      </Main>

      {/* ========================================================
          TASK DIALOGS
      ======================================================== */}

      <TasksDialogs />
    </TasksProvider>
  );
}

export default Tasks;
