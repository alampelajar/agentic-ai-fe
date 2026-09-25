import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bot, Check, ChevronDown, Cpu } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/stores/auth-store";

const API_URL = "http://localhost:8080";

// ============================================================
// TYPES
// ============================================================

export type AgentModel = {
  id: number;
  name: string;
  model_id: string;
  description: string;
  is_system: boolean;
  is_active: boolean;

  provider: {
    id: number;
    name: string;
    type: string;
    base_url: string;
    is_system: boolean;
  };
};

export type Agent = {
  id: number;
  slug: string;
  name: string;
  description: string;
  status: string;
  is_active: boolean;
  models: AgentModel[];
};

type AgentSelectorProps = {
  selectedAgent: Agent | null;
  onSelect: (agent: Agent) => void;

  selectedModel: AgentModel | null;
  onModelSelect: (model: AgentModel | null) => void;
};

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

// ============================================================
// COMPONENT
// ============================================================

export function AgentSelector({
  selectedAgent,
  onSelect,
  selectedModel,
  onModelSelect,
}: AgentSelectorProps) {
  const { t } = useTranslation();

  const accessToken = useAuthStore((state) => state.auth.accessToken);

  const agentTriggerRef = useRef<HTMLButtonElement>(null);

  const modelTriggerRef = useRef<HTMLButtonElement>(null);

  const [agents, setAgents] = useState<Agent[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [openAgent, setOpenAgent] = useState(false);

  const [openModel, setOpenModel] = useState(false);

  const [agentPosition, setAgentPosition] = useState<DropdownPosition | null>(
    null,
  );

  const [modelPosition, setModelPosition] = useState<DropdownPosition | null>(
    null,
  );

  // ============================================================
  // INTERNAL MODEL STATE
  // ============================================================
  //
  // Ini dibuat supaya perubahan model langsung terlihat
  // di komponen meskipun update state parent belum selesai.
  //

  const [internalSelectedModel, setInternalSelectedModel] =
    useState<AgentModel | null>(selectedModel);

  // ============================================================
  // SYNC MODEL DARI PARENT
  // ============================================================

  useEffect(() => {
    setInternalSelectedModel(selectedModel);
  }, [selectedModel]);

  // ============================================================
  // LOAD AGENTS
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const loadAgents = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/agents`, {
          method: "GET",
          headers: {
            ...(accessToken
              ? {
                  Authorization: `Bearer ${accessToken}`,
                }
              : {}),
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || data?.message || t("agentSelector.errors.loadAgents"),
          );
        }

        if (cancelled) {
          return;
        }

        const loadedAgents: Agent[] = Array.isArray(data?.agents)
          ? data.agents
          : [];

        setAgents(loadedAgents);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setAgents([]);

        setError(err instanceof Error ? err.message : t("agentSelector.errors.loadAgents"));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAgents();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // ============================================================
  // AGENT POSITION
  // ============================================================

  const calculateAgentPosition = () => {
    if (!agentTriggerRef.current) {
      return;
    }

    const rect = agentTriggerRef.current.getBoundingClientRect();

    const dropdownHeight = Math.min(500, window.innerHeight * 0.65);

    const gap = 8;

    const spaceBelow = window.innerHeight - rect.bottom;

    const spaceAbove = rect.top;

    const openAbove =
      spaceBelow < dropdownHeight + gap && spaceAbove > spaceBelow;

    const top = openAbove
      ? Math.max(8, rect.top - dropdownHeight - gap)
      : rect.bottom + gap;

    setAgentPosition({
      top,
      left: rect.left,
      width: rect.width,
    });
  };

  // ============================================================
  // MODEL POSITION
  // ============================================================

  const calculateModelPosition = () => {
    if (!modelTriggerRef.current) {
      return;
    }

    const rect = modelTriggerRef.current.getBoundingClientRect();

    const dropdownHeight = Math.min(420, window.innerHeight * 0.55);

    const gap = 8;

    const spaceBelow = window.innerHeight - rect.bottom;

    const spaceAbove = rect.top;

    const openAbove =
      spaceBelow < dropdownHeight + gap && spaceAbove > spaceBelow;

    const top = openAbove
      ? Math.max(8, rect.top - dropdownHeight - gap)
      : rect.bottom + gap;

    setModelPosition({
      top,
      left: rect.left,
      width: rect.width,
    });
  };

  // ============================================================
  // AGENT DROPDOWN POSITION LISTENER
  // ============================================================

  useLayoutEffect(() => {
    if (!openAgent) {
      return;
    }

    calculateAgentPosition();

    const update = calculateAgentPosition;

    window.addEventListener("resize", update);

    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);

      window.removeEventListener("scroll", update, true);
    };
  }, [openAgent]);

  // ============================================================
  // MODEL DROPDOWN POSITION LISTENER
  // ============================================================

  useLayoutEffect(() => {
    if (!openModel) {
      return;
    }

    calculateModelPosition();

    const update = calculateModelPosition;

    window.addEventListener("resize", update);

    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);

      window.removeEventListener("scroll", update, true);
    };
  }, [openModel]);

  // ============================================================
  // ESCAPE
  // ============================================================

  useEffect(() => {
    if (!openAgent && !openModel) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setOpenAgent(false);
      setOpenModel(false);
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openAgent, openModel]);

  // ============================================================
  // CLICK OUTSIDE
  // ============================================================

  useEffect(() => {
    if (!openAgent && !openModel) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (agentTriggerRef.current?.contains(target)) {
        return;
      }

      if (modelTriggerRef.current?.contains(target)) {
        return;
      }

      setOpenAgent(false);
      setOpenModel(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [openAgent, openModel]);

  // ============================================================
  // SELECT AGENT
  // ============================================================

  const handleSelectAgent = (agent: Agent) => {
    onSelect(agent);

    // Model pertama menjadi model default
    const defaultModel =
      Array.isArray(agent.models) && agent.models.length > 0
        ? agent.models[0]
        : null;

    setInternalSelectedModel(defaultModel);

    onModelSelect(defaultModel);

    setOpenAgent(false);
  };

  // ============================================================
  // SELECT MODEL
  // ============================================================

  const handleSelectModel = (model: AgentModel) => {
    console.log("[MODEL SELECTED]", model.name, model.model_id);

    // Update internal state SEGERA
    setInternalSelectedModel(model);

    // Update parent state
    onModelSelect(model);

    // Tutup dropdown
    setOpenModel(false);
  };

  // ============================================================
  // AGENT DROPDOWN
  // ============================================================

  const agentDropdown =
    openAgent && agentPosition
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999]"
            style={{
              pointerEvents: "none",
            }}
          >
            <div
              className="absolute rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
              style={{
                top: agentPosition.top,
                left: agentPosition.left,
                width: agentPosition.width,
                pointerEvents: "auto",
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="border-b border-border px-5 py-4">
                <h3 className="text-base font-semibold">{t("agentSelector.selectAgent")}</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Pilih Agent yang ingin digunakan.
                </p>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-2">
                {loading && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Memuat Agent...
                  </div>
                )}

                {!loading && error && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-destructive">{error}</p>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Periksa koneksi backend.
                    </p>
                  </div>
                )}

                {!loading && !error && agents.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Tidak ada Agent tersedia.
                    </p>
                  </div>
                )}

                {!loading &&
                  !error &&
                  agents.map((agent) => {
                    const isSelected = selectedAgent?.id === agent.id;

                    const modelCount = Array.isArray(agent.models)
                      ? agent.models.length
                      : 0;

                    const isReady =
                      agent.status === "ready" || agent.status === "Siap";

                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => handleSelectAgent(agent)}
                        className={`flex w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors ${
                          isSelected ? "bg-accent" : "hover:bg-accent/60"
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
                          <Bot className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold">
                              {agent.name}
                            </span>

                            {isReady && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                            )}
                          </div>

                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {agent.description}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {modelCount} {modelCount === 1 ? t("agentSelector.model") : t("agentSelector.models")}
                          </p>
                        </div>

                        {isSelected && <Check className="h-5 w-5 shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  // ============================================================
  // MODEL DROPDOWN
  // ============================================================

  const modelDropdown =
    openModel && modelPosition && selectedAgent
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999]"
            style={{
              pointerEvents: "none",
            }}
          >
            <div
              className="absolute rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
              style={{
                top: modelPosition.top,
                left: modelPosition.left,
                width: modelPosition.width,
                pointerEvents: "auto",
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
              {/* HEADER */}

              <div className="border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />

                  <h3 className="text-base font-semibold">{t("agentSelector.modelDropdown.title")}</h3>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {t("agentSelector.modelDropdown.forAgent")} {selectedAgent.name}.
                </p>
              </div>

              {/* MODEL LIST */}

              <div className="max-h-[55vh] overflow-y-auto p-2">
                {!selectedAgent.models || selectedAgent.models.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Belum ada model untuk Agent ini.
                    </p>
                  </div>
                ) : (
                  selectedAgent.models.map((model) => {
                    const isSelected = internalSelectedModel?.id === model.id;

                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => handleSelectModel(model)}
                        className={`flex w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors ${
                          isSelected ? "bg-accent" : "hover:bg-accent/60"
                        }`}
                      >
                        {/* ICON */}

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-background"
                          }`}
                        >
                          <Cpu className="h-5 w-5" />
                        </div>

                        {/* INFO */}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold">
                              {model.name}
                            </span>

                            {model.is_system && (
                              <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                SYSTEM
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {model.model_id}
                          </p>

                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {model.provider?.name || t("agentSelector.unknownProvider")}
                          </p>
                        </div>

                        {/* CHECK */}

                        {isSelected && (
                          <Check className="h-5 w-5 shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {/* ========================================================
          AGENT
      ======================================================== */}

      <button
        ref={agentTriggerRef}
        type="button"
        onClick={() => {
          setOpenModel(false);

          setOpenAgent((value) => !value);
        }}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md border border-border/70 bg-background/60 px-3 py-2 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/30">
          <Bot className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {selectedAgent ? selectedAgent.name : t("agentSelector.noAgentSelected")}
            </span>

            {selectedAgent && (
              <>
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />

                <span className="shrink-0 text-xs text-muted-foreground">
                  {selectedAgent.status === "ready"
                    ? t("agentSelector.ready")
                    : selectedAgent.status}
                </span>
              </>
            )}
          </div>

          <p className="truncate text-xs text-muted-foreground">
            {selectedAgent
              ? selectedAgent.description
              : t("agentSelector.selectAgent")}
          </p>
        </div>

        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
            openAgent ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* ========================================================
          MODEL
      ======================================================== */}

      {selectedAgent && (
        <button
          ref={modelTriggerRef}
          type="button"
          onClick={() => {
            setOpenAgent(false);

            setOpenModel((value) => !value);
          }}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-2 text-left transition-colors hover:bg-muted/40"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/40">
            <Cpu className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("agentSelector.model")}
            </p>

            <p className="truncate text-sm font-medium">
              {internalSelectedModel
                ? internalSelectedModel.name
                : t("agentSelector.modelDropdown.title")}
            </p>
          </div>

          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              openModel ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {/* PORTALS */}

      {agentDropdown}
      {modelDropdown}
    </div>
  );
}
