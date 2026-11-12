import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bot, Check, ChevronDown, Cpu } from "lucide-react";
import { useTranslation } from "react-i18next";

import { API_BASE_URL } from "@/lib/api-config";
import { useAuthStore } from "@/stores/auth-store";

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

// The trigger is a compact control, so the list under it is never narrower than
// a readable width, and never runs off the right edge of the window.
const DROPDOWN_MIN_WIDTH = 360;

function dropdownBox(rect: DOMRect) {
  const width = Math.min(
    Math.max(rect.width, DROPDOWN_MIN_WIDTH),
    window.innerWidth - 16,
  );

  return {
    width,
    left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
  };
}

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
        const response = await fetch(`${API_BASE_URL}/api/agents`, {
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
      ...dropdownBox(rect),
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
      ...dropdownBox(rect),
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
                <h3 className="text-base font-semibold">{t("agentSelector.agentDropdown.title")}</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  {t("agentSelector.agentDropdown.description")}
                </p>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-2">
                {loading && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("agentSelector.agentDropdown.loading")}
                  </div>
                )}

                {!loading && error && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-destructive">{error}</p>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("agentSelector.agentDropdown.checkBackend")}
                    </p>
                  </div>
                )}

                {!loading && !error && agents.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t("agentSelector.agentDropdown.noAgents")}
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
                      {t("agentSelector.modelDropdown.noModels")}
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

  const control =
    "flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-border bg-transparent px-3 text-left text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-expanded:border-primary";

  return (
    <>
      {/* ========================================================
          AGENT
      ======================================================== */}

      <button
        ref={agentTriggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={openAgent}
        onClick={() => {
          setOpenModel(false);

          setOpenAgent((value) => !value);
        }}
        className={`${control} sm:w-auto sm:max-w-[15rem]`}
      >
        <Bot aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />

        <span className="truncate font-medium">
          {selectedAgent ? selectedAgent.name : t("agentSelector.noAgentSelected")}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
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
          aria-haspopup="listbox"
          aria-expanded={openModel}
          onClick={() => {
            setOpenAgent(false);

            setOpenModel((value) => !value);
          }}
          className={`${control} sm:w-auto sm:max-w-[18rem]`}
        >
          <Cpu aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />

          <span className="shrink-0 text-xs text-muted-foreground">
            {t("agentSelector.model")}
          </span>

          <span className="truncate font-medium">
            {internalSelectedModel
              ? internalSelectedModel.name
              : t("agentSelector.modelDropdown.title")}
          </span>

          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${
              openModel ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {/* PORTALS */}

      {agentDropdown}
      {modelDropdown}
    </>
  );
}
