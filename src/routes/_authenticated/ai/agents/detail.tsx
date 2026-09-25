import { createFileRoute } from "@tanstack/react-router";
import { AgentDetail } from "@/features/agents/agent-detail";

export const Route = createFileRoute("/_authenticated/ai/agents/detail")({
  component: AgentDetail,
});
