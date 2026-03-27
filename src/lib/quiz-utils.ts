export function normalizeShortAnswer(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
