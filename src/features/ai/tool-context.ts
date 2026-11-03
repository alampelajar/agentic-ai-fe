/**
 * What the chat tells the model about where it can work, and when the browser
 * runs the tools the model asks for. Kept apart from the (large) chat page so the
 * rules can be tested: a Cloud Workspace never depends on the Desktop Runtime.
 */

export type ToolContextInput = {
  /** A cloud workspace is selected for this chat. */
  cloudWorkspaceSelected: boolean
  /** The Desktop Runtime (Local Agent Runner) is connected. */
  runtimeConnected: boolean
  /** A local project folder of the runner is selected. */
  localFolderId: string
  /** The agent is a coding or testing agent. */
  codingOrTesting: boolean
}

/**
 * Tools run when a cloud workspace is selected, or when the Desktop Runtime is
 * connected and either no local folder is chosen (desktop tools only) or the agent
 * is a coding or testing agent working in the chosen folder, as before.
 */
export function shouldRunTools(input: ToolContextInput): boolean {
  if (input.cloudWorkspaceSelected) return true
  if (!input.runtimeConnected) return false
  return input.localFolderId === '' || input.codingOrTesting
}

/** The bracketed hints added to the user's message for the model. */
export function buildContextHints(input: { cloudWorkspaceSelected: boolean; runtimeConnected: boolean; localFolderId: string; runtimeUrl: string }): string[] {
  const hints: string[] = []
  if (input.cloudWorkspaceSelected) {
    hints.push('[CLOUD WORKSPACE CONTEXT: a cloud workspace is selected. Use the registered workspace.* tools for its files, tests and builds. No Local Agent Runner is needed for it.]')
  }
  if (input.runtimeConnected && input.localFolderId) {
    hints.push(
      `[LOCAL RUNNER CONTEXT: connected=true; workspace=${input.localFolderId}; base_url=${input.runtimeUrl}. You may request one allowed Local Agent Runner tool at a time using the exact <LOCAL_AGENT_TOOL>{JSON}</LOCAL_AGENT_TOOL> protocol. File writes and command execution require user approval.]`
    )
  } else if (!input.cloudWorkspaceSelected) {
    hints.push('[LOCAL RUNNER CONTEXT: connected=false. Do not emit Local Agent Runner tool markers. Explain the required manual steps instead.]')
  }
  return hints
}

/** The first read-only tool a model is asked to call when it only narrated a plan. */
export function firstToolMarker(cloudWorkspaceSelected: boolean): string {
  return cloudWorkspaceSelected
    ? '<AGENT_TOOL>{"action":"workspace.list_files","arguments":{}}</AGENT_TOOL>'
    : '<LOCAL_AGENT_TOOL>{"action":"list-files","path":"."}</LOCAL_AGENT_TOOL>'
}
