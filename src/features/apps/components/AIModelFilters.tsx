// ============================================================
// AI MODEL FILTERS
// ============================================================

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { AIFilterType } from "../types";

interface AIModelFiltersProps {
  value: AIFilterType;
  onChange: (filter: AIFilterType) => void;
}

const FILTER_OPTIONS: AIFilterType[] = [
  "all",
  "free",
  "free-tier",
  "api",
  "connected",
];

// Mapping dari filter value ke i18n key
const FILTER_I18N_MAP: Record<AIFilterType, string> = {
  all: "aiModelHub.filters.all",
  free: "aiModelHub.filters.free",
  "free-tier": "aiModelHub.filters.freeTier",
  api: "aiModelHub.filters.apiKey",
  connected: "aiModelHub.filters.connected",
};

export function AIModelFilters({ value, onChange }: AIModelFiltersProps) {
  const { t } = useTranslation();

  return (
    <div
      className="
        flex
        flex-wrap
        gap-1.5
      "
      role="group"
      aria-label="Filter AI models"
    >
      {FILTER_OPTIONS.map((option) => {
        const isActive = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={isActive}
            className={cn(
              // Base
              "h-8 rounded-lg border px-3 text-xs font-medium transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              // Active
              isActive
                ? "border-violet-500/60 bg-violet-500/15 text-violet-400 dark:border-violet-500/50 dark:bg-violet-500/20 dark:text-violet-300"
                : // Inactive
                  "border-border bg-transparent text-muted-foreground hover:border-border/80 hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {t(FILTER_I18N_MAP[option])}
          </button>
        );
      })}
    </div>
  );
}
