/** The server's message, or a plain fallback when there is none. */
export const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback
