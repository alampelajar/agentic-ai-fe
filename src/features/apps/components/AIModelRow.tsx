// ============================================================
// AI MODEL ROW
// ============================================================
// Satu baris model di dalam list provider.
// Ditampilkan di bawah AIProviderRow saat provider di-expand.
// ============================================================

import { useTranslation } from "react-i18next";
import { Check, ExternalLink, Key, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AIModel, AIProvider } from "../types";
import { useAIModelStore } from "../store/ai-model-store";

interface AIModelRowProps {
  model: AIModel;
  provider: AIProvider;
  providerIsConnected: boolean;
  onSelectModel: (model: AIModel, provider: AIProvider) => void;
  onOpenDetail: (model: AIModel, provider: AIProvider) => void;
}

export function AIModelRow({
  model,
  provider,
  providerIsConnected,
  onSelectModel,
  onOpenDetail,
}: AIModelRowProps) {
  const { t } = useTranslation();

  const { activeModel, setActiveModel } = useAIModelStore();

  const isActive = activeModel?.id === model.id;

  // Provider dianggap connected jika: status asli === connected
  // ATAU sudah di-connect oleh user di sesi ini
  const isAvailable =
    providerIsConnected ||
    provider.status === "connected" ||
    !model.requiresApiKey;

  // ============================================================
  // ACCESS BADGE
  // ============================================================

  const accessBadge = () => {
    if (model.requiresApiKey) {
      return (
        <span
          className="
            inline-flex
            items-center
            gap-1
            rounded-md
            border
            border-amber-200/60
            bg-amber-50/80
            px-2
            py-0.5
            text-[10px]
            font-semibold
            uppercase
            tracking-wide
            text-amber-600
            dark:border-amber-700/50
            dark:bg-amber-900/20
            dark:text-amber-400
          "
        >
          <Key size={9} />
          {t("aiModelHub.access.apiKey")}
        </span>
      );
    }

    if (model.category === "free-tier") {
      return (
        <span
          className="
            inline-flex
            items-center
            gap-1
            rounded-md
            border
            border-sky-200/60
            bg-sky-50/80
            px-2
            py-0.5
            text-[10px]
            font-semibold
            uppercase
            tracking-wide
            text-sky-600
            dark:border-sky-700/50
            dark:bg-sky-900/20
            dark:text-sky-400
          "
        >
          <Zap size={9} />
          {t("aiModelHub.access.freeTier")}
        </span>
      );
    }

    return (
      <span
        className="
          inline-flex
          items-center
          gap-1
          rounded-md
          border
          border-emerald-200/60
          bg-emerald-50/80
          px-2
          py-0.5
          text-[10px]
          font-semibold
          uppercase
          tracking-wide
          text-emerald-600
          dark:border-emerald-700/50
          dark:bg-emerald-900/20
          dark:text-emerald-400
        "
      >
        <Zap size={9} />
        {t("aiModelHub.access.free")}
      </span>
    );
  };

  // ============================================================
  // ACTION BUTTON
  // ============================================================

  const actionButton = () => {
    if (provider.status === "unavailable") {
      return (
        <Button
          variant="outline"
          size="sm"
          disabled
          className="h-7 min-w-[90px] cursor-not-allowed text-xs opacity-50"
        >
          {t("aiModelHub.actions.unavailable")}
        </Button>
      );
    }

    if (isActive) {
      return (
        <Button
          variant="outline"
          size="sm"
          disabled
          className="
            h-7
            min-w-[90px]
            cursor-default
            border-emerald-200/60
            bg-emerald-50/80
            text-xs
            text-emerald-600
            dark:border-emerald-700/50
            dark:bg-emerald-900/20
            dark:text-emerald-400
          "
        >
          <Check size={11} className="mr-1" />
          {t("aiModelHub.actions.connected")}
        </Button>
      );
    }

    if (!isAvailable && model.requiresApiKey) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectModel(model, provider)}
          className="
            h-7
            min-w-[90px]
            border-violet-200/60
            text-xs
            text-violet-600
            hover:bg-violet-50
            dark:border-violet-700/50
            dark:text-violet-400
            dark:hover:bg-violet-900/20
          "
        >
          {t("aiModelHub.actions.connect")}
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setActiveModel(model, provider);
          onSelectModel(model, provider);
        }}
        className="
          h-7
          min-w-[90px]
          border-violet-200/60
          text-xs
          text-violet-600
          hover:bg-violet-50
          dark:border-violet-700/50
          dark:text-violet-400
          dark:hover:bg-violet-900/20
        "
      >
        {t("aiModelHub.actions.useModel")}
      </Button>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className={cn(
        // Base row
        "group flex items-center gap-3 border-b border-border/40 py-2.5 pl-10 pr-3 transition-colors last:border-b-0",
        // Hover
        "hover:bg-muted/30",
        // Active model highlight
        isActive && "bg-emerald-500/5 hover:bg-emerald-500/8",
      )}
    >
      {/* Active indicator */}
      <div
        className={cn(
          "h-4 w-0.5 shrink-0 rounded-full transition-all",
          isActive ? "bg-emerald-500" : "bg-transparent",
        )}
      />

      {/* Model name + description */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpenDetail(model, provider)}
          className="
            flex
            items-center
            gap-1.5
            text-left
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
        >
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              isActive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-foreground hover:text-violet-500 dark:hover:text-violet-400",
            )}
          >
            {model.name}
          </span>
          <ExternalLink
            size={11}
            className="shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </button>

        {/* Description – hidden on very small screens */}
        {model.description && (
          <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
            {model.description}
          </p>
        )}
      </div>

      {/* Context window */}
      {model.contextWindow && (
        <span className="hidden shrink-0 text-xs text-muted-foreground/70 lg:block">
          {Math.round(model.contextWindow / 1000)}k ctx
        </span>
      )}

      {/* Access badge */}
      <div className="hidden shrink-0 sm:block">{accessBadge()}</div>

      {/* Action */}
      <div className="shrink-0">{actionButton()}</div>
    </div>
  );
}
