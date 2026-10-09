// ============================================================
// ACTIVE MODEL CARD
// ============================================================
// Menampilkan model AI yang sedang aktif.
// Membaca state dari ai-model-store (Zustand + persist).
// ============================================================

import { useTranslation } from "react-i18next";
import { Check, Cpu, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAIModelStore } from "../store/ai-model-store";

interface ActiveModelCardProps {
  /** Dipanggil saat user klik "Ganti Model" */
  onChangeModel?: () => void;
}

export function ActiveModelCard({ onChangeModel }: ActiveModelCardProps) {
  const { t } = useTranslation();

  const { activeModel, activeProvider } = useAIModelStore();

  // ============================================================
  // NO ACTIVE MODEL
  // ============================================================

  if (!activeModel || !activeProvider) {
    return (
      <div
        className="
          flex
          items-center
          gap-3
          rounded-xl
          border
          border-dashed
          border-border/60
          bg-muted/20
          px-4
          py-3
        "
      >
        <div
          className="
            flex
            size-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            border-border/50
            bg-muted/40
            text-muted-foreground
          "
        >
          <Cpu size={15} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("aiModelHub.activeModel.none")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("aiModelHub.activeModel.noneDescription")}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ACCESS BADGE
  // ============================================================

  const accessLabel = () => {
    if (activeModel.requiresApiKey) return t("aiModelHub.access.apiKey");
    if (activeModel.category === "free-tier") return t("aiModelHub.access.freeTier");
    return t("aiModelHub.access.free");
  };

  const accessColorClass = () => {
    if (activeModel.requiresApiKey) return "text-amber-500 dark:text-amber-400";
    if (activeModel.category === "free-tier") return "text-sky-500 dark:text-sky-400";
    return "text-emerald-500 dark:text-emerald-400";
  };

  // ============================================================
  // RENDER — ACTIVE MODEL
  // ============================================================

  return (
    <div
      className="
        flex
        items-center
        gap-3
        rounded-xl
        border
        border-emerald-200/50
        bg-emerald-500/5
        px-4
        py-3
        dark:border-emerald-700/40
        dark:bg-emerald-500/8
      "
    >
      {/* Icon */}
      <div
        className="
          flex
          size-8
          shrink-0
          items-center
          justify-center
          rounded-lg
          border
          border-emerald-200/60
          bg-emerald-50/80
          text-emerald-600
          dark:border-emerald-700/50
          dark:bg-emerald-900/30
          dark:text-emerald-400
        "
      >
        <Zap size={14} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {activeModel.name}
          </p>

          {/* Check mark */}
          <span
            className="
              flex
              size-4
              items-center
              justify-center
              rounded-full
              bg-emerald-500/20
              text-emerald-600
              dark:bg-emerald-500/25
              dark:text-emerald-400
            "
          >
            <Check size={10} strokeWidth={3} />
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {activeProvider.name}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className={cn("text-xs font-medium", accessColorClass())}>
            {accessLabel()}
          </span>
        </div>
      </div>

      {/* Change model button */}
      {onChangeModel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onChangeModel}
          className="
            h-7
            shrink-0
            border
            border-border/50
            px-2.5
            text-xs
            text-muted-foreground
            hover:text-foreground
          "
        >
          {t("aiModelHub.actions.changeModel")}
        </Button>
      )}
    </div>
  );
}
