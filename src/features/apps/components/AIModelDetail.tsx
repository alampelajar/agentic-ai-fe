// ============================================================
// AI MODEL DETAIL — MODAL
// ============================================================
// Menampilkan detail lengkap sebuah model AI.
// Menggunakan Shadcn Dialog yang sudah tersedia di project.
// ============================================================

import { useTranslation } from "react-i18next";
import { Check, ExternalLink, Key, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AIModel, AIProvider } from "../types";
import { useAIModelStore } from "../store/ai-model-store";
import {
  connectProvider,
  selectModel,
} from "../services/aiModelService";

interface AIModelDetailProps {
  model: AIModel | null;
  provider: AIProvider | null;
  open: boolean;
  onClose: () => void;
}

export function AIModelDetail({
  model,
  provider,
  open,
  onClose,
}: AIModelDetailProps) {
  const { t } = useTranslation();

  const {
    activeModel,
    setActiveModel,
    isProviderConnected,
    markProviderConnected,
    isConnecting,
    connectingProviderId,
    setConnecting,
  } = useAIModelStore();

  if (!model || !provider) return null;

  const isActive = activeModel?.id === model.id;

  const providerConnected =
    provider.status === "connected" || isProviderConnected(provider.id);

  const isThisConnecting =
    isConnecting && connectingProviderId === provider.id;

  // ============================================================
  // USE MODEL
  // ============================================================

  const handleUseModel = async () => {
    try {
      await selectModel(model.id);
      setActiveModel(model, provider);
      toast.success(t("aiModelHub.selectSuccess"));
      onClose();
    } catch {
      toast.error(t("aiModelHub.selectError"));
    }
  };

  // ============================================================
  // CONNECT PROVIDER
  // ============================================================

  const handleConnect = async () => {
    if (isConnecting) return;

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
  // ACCESS BADGE
  // ============================================================

  const AccessBadge = () => {
    if (model.requiresApiKey) {
      return (
        <span
          className="
            inline-flex
            items-center
            gap-1.5
            rounded-md
            border
            border-amber-200/60
            bg-amber-50/80
            px-2.5
            py-1
            text-xs
            font-semibold
            uppercase
            tracking-wide
            text-amber-600
            dark:border-amber-700/50
            dark:bg-amber-900/20
            dark:text-amber-400
          "
        >
          <Key size={10} />
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
            gap-1.5
            rounded-md
            border
            border-sky-200/60
            bg-sky-50/80
            px-2.5
            py-1
            text-xs
            font-semibold
            uppercase
            tracking-wide
            text-sky-600
            dark:border-sky-700/50
            dark:bg-sky-900/20
            dark:text-sky-400
          "
        >
          <Zap size={10} />
          {t("aiModelHub.access.freeTier")}
        </span>
      );
    }

    return (
      <span
        className="
          inline-flex
          items-center
          gap-1.5
          rounded-md
          border
          border-emerald-200/60
          bg-emerald-50/80
          px-2.5
          py-1
          text-xs
          font-semibold
          uppercase
          tracking-wide
          text-emerald-600
          dark:border-emerald-700/50
          dark:bg-emerald-900/20
          dark:text-emerald-400
        "
      >
        <Zap size={10} />
        {t("aiModelHub.access.free")}
      </span>
    );
  };

  // ============================================================
  // FOOTER ACTION BUTTON
  // ============================================================

  const FooterAction = () => {
    if (provider.status === "unavailable") {
      return (
        <Button variant="outline" disabled className="w-full sm:w-auto">
          {t("aiModelHub.actions.unavailable")}
        </Button>
      );
    }

    if (isActive) {
      return (
        <Button
          variant="outline"
          disabled
          className="
            w-full
            border-emerald-200/60
            bg-emerald-50/80
            text-emerald-600
            dark:border-emerald-700/50
            dark:bg-emerald-900/20
            dark:text-emerald-400
            sm:w-auto
          "
        >
          <Check size={14} className="mr-1.5" />
          {t("aiModelHub.actions.connected")}
        </Button>
      );
    }

    if (model.requiresApiKey && !providerConnected) {
      return (
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full sm:w-auto"
        >
          {isThisConnecting ? (
            <>
              <Loader2 size={14} className="mr-1.5 animate-spin" />
              {t("aiModelHub.connecting")}
            </>
          ) : (
            t("aiModelHub.actions.connect")
          )}
        </Button>
      );
    }

    return (
      <Button onClick={handleUseModel} className="w-full sm:w-auto">
        {t("aiModelHub.actions.useModel")}
      </Button>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md gap-0 p-0">
        {/* ====================================================
            HEADER
        ==================================================== */}
        <DialogHeader className="px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold leading-snug">
                {model.name}
              </DialogTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {provider.name}
              </p>
            </div>
            <AccessBadge />
          </div>
        </DialogHeader>

        <Separator />

        {/* ====================================================
            BODY
        ==================================================== */}
        <div className="space-y-4 px-5 py-4">
          {/* Description */}
          {model.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {model.description}
            </p>
          )}

          {/* Capabilities */}
          {model.capabilities && model.capabilities.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("aiModelHub.detail.capabilities")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {model.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="
                      rounded-md
                      border
                      border-border/60
                      bg-muted/50
                      px-2
                      py-0.5
                      text-xs
                      text-foreground/80
                    "
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta info grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Authentication */}
            <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("aiModelHub.detail.authentication")}
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  model.requiresApiKey
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {provider.authType === "oauth"
                  ? t("aiModelHub.detail.authOAuth")
                  : model.requiresApiKey
                    ? t("aiModelHub.detail.authApiKey")
                    : t("aiModelHub.detail.authNone")}
              </p>
            </div>

            {/* Context window */}
            {model.contextWindow ? (
              <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("aiModelHub.detail.contextWindow")}
                </p>
                <p className="text-xs font-medium text-foreground">
                  {Math.round(model.contextWindow / 1000)}k{" "}
                  <span className="text-muted-foreground">
                    {t("aiModelHub.detail.tokens")}
                  </span>
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("aiModelHub.detail.status")}
                </p>
                <p
                  className={cn(
                    "text-xs font-medium",
                    provider.status === "connected" ||
                      isProviderConnected(provider.id)
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-violet-600 dark:text-violet-400",
                  )}
                >
                  {provider.status === "connected" ||
                  isProviderConnected(provider.id)
                    ? t("aiModelHub.status.connected")
                    : t("aiModelHub.status.available")}
                </p>
              </div>
            )}
          </div>

          {/* Website */}
          {provider.website && (
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex
                items-center
                gap-1.5
                text-xs
                text-muted-foreground
                underline-offset-4
                transition-colors
                hover:text-foreground
                hover:underline
              "
            >
              <ExternalLink size={11} />
              {t("aiModelHub.detail.visitWebsite")}
            </a>
          )}
        </div>

        <Separator />

        {/* ====================================================
            FOOTER
        ==================================================== */}
        <DialogFooter className="px-5 py-4">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {t("common.close")}
          </Button>
          <FooterAction />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
