// ============================================================
// AI PROVIDER ROW
// ============================================================
// Baris provider yang dapat di-expand untuk menampilkan
// daftar model di bawahnya.
// ============================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AIModel, AIProvider } from "../types";
import { useAIModelStore } from "../store/ai-model-store";
import { connectProvider } from "../services/aiModelService";
import { AIModelRow } from "./AIModelRow";
import { ProviderStatus } from "./ProviderStatus";

interface AIProviderRowProps {
  provider: AIProvider;
  defaultExpanded?: boolean;
  onSelectModel: (model: AIModel, provider: AIProvider) => void;
  onOpenDetail: (model: AIModel, provider: AIProvider) => void;
}

export function AIProviderRow({
  provider,
  defaultExpanded = false,
  onSelectModel,
  onOpenDetail,
}: AIProviderRowProps) {
  const { t } = useTranslation();

  const {
    isProviderConnected,
    markProviderConnected,
    isConnecting,
    connectingProviderId,
    setConnecting,
  } = useAIModelStore();

  const [expanded, setExpanded] = useState(defaultExpanded);

  const providerConnected =
    provider.status === "connected" || isProviderConnected(provider.id);

  const isThisConnecting =
    isConnecting && connectingProviderId === provider.id;

  // ============================================================
  // HANDLE CONNECT
  // ============================================================

  const handleConnect = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (providerConnected || isConnecting) return;

    setConnecting(provider.id);

    try {
      const result = await connectProvider(provider.id);

      if (result.success) {
        markProviderConnected(provider.id);
        toast.success(t("aiModelHub.connectSuccess"));
      }
    } catch {
      toast.error(t("aiModelHub.connectError"));
    } finally {
      setConnecting(null);
    }
  };

  // ============================================================
  // PROVIDER INITIALS AVATAR
  // ============================================================

  const accentClasses: Record<string, string> = {
    violet:
      "border-violet-200/60 bg-violet-50/80 text-violet-600 dark:border-violet-700/50 dark:bg-violet-900/30 dark:text-violet-400",
    sky: "border-sky-200/60 bg-sky-50/80 text-sky-600 dark:border-sky-700/50 dark:bg-sky-900/30 dark:text-sky-400",
    blue: "border-blue-200/60 bg-blue-50/80 text-blue-600 dark:border-blue-700/50 dark:bg-blue-900/30 dark:text-blue-400",
    orange:
      "border-orange-200/60 bg-orange-50/80 text-orange-600 dark:border-orange-700/50 dark:bg-orange-900/30 dark:text-orange-400",
    emerald:
      "border-emerald-200/60 bg-emerald-50/80 text-emerald-600 dark:border-emerald-700/50 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  const avatarClass =
    accentClasses[provider.accentColor ?? "violet"] ?? accentClasses.violet;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="overflow-hidden">
      {/* ======================================================
          PROVIDER HEADER ROW
      ====================================================== */}
      <div
        className={cn(
          "flex cursor-pointer items-center gap-3 border-b border-border/50 px-3 py-3 transition-colors",
          "hover:bg-muted/40",
          expanded && "bg-muted/20",
        )}
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        aria-expanded={expanded}
      >
        {/* Chevron */}
        <span className="shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronDown size={15} />
          ) : (
            <ChevronRight size={15} />
          )}
        </span>

        {/* Provider avatar */}
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold",
            avatarClass,
          )}
        >
          {provider.iconInitials ?? provider.name.slice(0, 2).toUpperCase()}
        </div>

        {/* Provider info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{provider.name}</span>

            {/* Model count */}
            <span className="hidden text-xs text-muted-foreground sm:block">
              {provider.models.length === 1
                ? t("aiModelHub.modelsCount", { count: provider.models.length })
                : t("aiModelHub.modelsCountPlural", {
                    count: provider.models.length,
                  })}
            </span>
          </div>

          {/* Description – desktop only */}
          <p className="hidden truncate text-xs text-muted-foreground lg:block">
            {provider.description}
          </p>
        </div>

        {/* Status */}
        <div className="hidden shrink-0 sm:block">
          <ProviderStatus
            status={provider.status}
            isConnectedOverride={providerConnected}
          />
        </div>

        {/* Website link */}
        {provider.website && (
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="
              hidden
              shrink-0
              rounded
              p-1
              text-muted-foreground/60
              transition-colors
              hover:text-muted-foreground
              lg:block
            "
            aria-label={`Visit ${provider.name} website`}
          >
            <Globe size={13} />
          </a>
        )}

        {/* Connect / Connected button */}
        {provider.authType === "api-key" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            disabled={providerConnected || isConnecting}
            className={cn(
              "h-7 shrink-0 text-xs",
              providerConnected
                ? "border-emerald-200/60 bg-emerald-50/80 text-emerald-600 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-400"
                : "border-violet-200/60 text-violet-600 hover:bg-violet-50 dark:border-violet-700/50 dark:text-violet-400 dark:hover:bg-violet-900/20",
            )}
          >
            {isThisConnecting ? (
              <>
                <Loader2 size={11} className="mr-1 animate-spin" />
                {t("aiModelHub.connecting")}
              </>
            ) : providerConnected ? (
              t("aiModelHub.actions.connected")
            ) : (
              t("aiModelHub.actions.connect")
            )}
          </Button>
        )}
      </div>

      {/* ======================================================
          MODEL ROWS (expanded)
      ====================================================== */}
      {expanded && (
        <div className="bg-muted/10">
          {provider.models.map((model) => (
            <AIModelRow
              key={model.id}
              model={model}
              provider={provider}
              providerIsConnected={providerConnected}
              onSelectModel={onSelectModel}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
}
