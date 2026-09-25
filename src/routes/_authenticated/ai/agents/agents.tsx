import { createFileRoute } from "@tanstack/react-router";
import { Agents } from "@/features/agents";

export const Route = createFileRoute("/_authenticated/ai/agents/agents")({
  component: Agents,
});
