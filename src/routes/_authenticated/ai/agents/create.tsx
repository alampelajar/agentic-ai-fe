import { createFileRoute } from "@tanstack/react-router";
import { CreateAgent } from "@/features/agents/create-agent";

export const Route = createFileRoute("/_authenticated/ai/agents/create")({
  component: CreateAgent,
});
