// ============================================================
// AI PROVIDER LIST — ORCHESTRATOR
// ============================================================
// Mengambil data provider, menerapkan filter + search,
// lalu merender daftar AIProviderRow.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, ServerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getProviders } from "../services/aiModelService";
import type { AIFilterType, AIModel, AIProvider } from "../types";
import { AIProviderRow } from "./AIProviderRow";

interface AIProviderListProps {
  searchTerm: string;
  filterType: AIFilterType;
  onSelectModel: (model: AIModel, provider: AIProvider) => void;
  onOpenDetail: (model: AIModel, provider: AIProvider) => void;
  onResetFilter: () => void;
}

export function AIProviderList({
  searchTerm,
  filterType,
  onSelectModel,
  onOpenDetail,
  onResetFilter,
}: AIProviderListProps) {
  const { t } = useTranslation();

  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // LOAD PROVIDERS
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getProviders();
        if (!cancelled) setProviders(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load providers.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // FILTER + SEARCH
  // ============================================================

  const filteredProviders = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return providers
      .map((provider) => {
        // --------------------------------------------------
        // 1. Filter by category / connection status
        // --------------------------------------------------
        let filteredModels = provider.models;

        if (filterType === "free") {
          filteredModels = filteredModels.filter(
            (m) => m.category === "free" && !m.requiresApiKey,
          );
        } else if (filterType === "free-tier") {
          filteredModels = filteredModels.filter(
            (m) => m.category === "free-tier",
          );
        } else if (filterType === "api") {
          filteredModels = filteredModels.filter((m) => m.requiresApiKey);
        } else if (filterType === "connected") {
          // Provider harus connected; semua modelnya ditampilkan
          if (provider.status !== "connected") {
            return null;
          }
        }

        // --------------------------------------------------
        // 2. Filter by search term
        // --------------------------------------------------
        if (term) {
          const providerMatch =
            provider.name.toLowerCase().includes(term) ||
            provider.description.toLowerCase().includes(term);

          if (providerMatch) {
            // Jika provider match, tampilkan semua modelnya (yang sudah difilter)
          } else {
            // Filter model berdasarkan nama, deskripsi, capabilities
            filteredModels = filteredModels.filter(
              (m) =>
                m.name.toLowerCase().includes(term) ||
                (m.description ?? "").toLowerCase().includes(term) ||
                (m.capabilities ?? []).some((cap) =>
                  cap.toLowerCase().includes(term),
                ),
            );
          }
        }

        // Jika tidak ada model yang lolos filter, skip provider ini
        if (filteredModels.length === 0) return null;

        return { ...provider, models: filteredModels };
      })
      .filter((p): p is AIProvider => p !== null);
  }, [providers, filterType, searchTerm]);

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-3"
          >
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // ============================================================
  // ERROR STATE
  // ============================================================

  if (error) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
          <ServerOff size={18} />
        </div>
        <div>
          <p className="text-sm font-medium">{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("common.retry")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RotateCcw size={13} className="mr-1.5" />
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  // ============================================================
  // EMPTY STATE
  // ============================================================

  if (filteredProviders.length === 0) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/50 bg-muted/20 px-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-lg border border-border/50 bg-muted/40 text-muted-foreground">
          <ServerOff size={18} />
        </div>
        <div>
          <p className="text-sm font-medium">{t("aiModelHub.empty.title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("aiModelHub.empty.description")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onResetFilter}>
          <RotateCcw size={13} className="mr-1.5" />
          {t("aiModelHub.empty.resetFilter")}
        </Button>
      </div>
    );
  }

  // ============================================================
  // PROVIDER LIST
  // ============================================================

  return (
    <div className="overflow-hidden rounded-xl border border-border/50">
      {/* Table header — desktop only */}
      <div className="hidden items-center gap-3 border-b border-border/50 bg-muted/30 px-3 py-2 sm:flex">
        <div className="w-8 shrink-0" />
        <div className="w-8 shrink-0" />
        <div className="flex-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("aiModelHub.tableHeaders.provider")} / {t("aiModelHub.tableHeaders.model")}
        </div>
        <div className="hidden w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:block">
          {t("aiModelHub.tableHeaders.status")}
        </div>
        <div className="w-24 shrink-0 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("aiModelHub.tableHeaders.action")}
        </div>
      </div>

      {/* Provider rows */}
      <div className="divide-y divide-border/30">
        {filteredProviders.map((provider, idx) => (
          <AIProviderRow
            key={provider.id}
            provider={provider}
            // Expand Kiro AI (first/connected provider) by default
            defaultExpanded={idx === 0 || provider.status === "connected"}
            onSelectModel={onSelectModel}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </div>
  );
}
