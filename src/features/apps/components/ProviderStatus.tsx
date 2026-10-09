// ============================================================
// PROVIDER STATUS BADGE
// ============================================================

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { AIProviderStatus } from "../types";

interface ProviderStatusProps {
  status: AIProviderStatus;
  /** Override dengan status "connected" dari store */
  isConnectedOverride?: boolean;
  className?: string;
}

export function ProviderStatus({
  status,
  isConnectedOverride,
  className,
}: ProviderStatusProps) {
  const { t } = useTranslation();

  const resolvedStatus: AIProviderStatus = isConnectedOverride
    ? "connected"
    : status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        resolvedStatus === "connected" &&
          "text-emerald-500 dark:text-emerald-400",
        resolvedStatus === "available" &&
          "text-violet-500 dark:text-violet-400",
        resolvedStatus === "unavailable" && "text-muted-foreground",
        className,
      )}
    >
      {/* Dot indicator */}
      <span
        className={cn(
          "inline-block size-1.5 rounded-full",
          resolvedStatus === "connected" &&
            "bg-emerald-500 dark:bg-emerald-400",
          resolvedStatus === "available" && "bg-violet-500 dark:bg-violet-400",
          resolvedStatus === "unavailable" && "bg-muted-foreground",
        )}
      />
      {t(`aiModelHub.status.${resolvedStatus}`)}
    </span>
  );
}
