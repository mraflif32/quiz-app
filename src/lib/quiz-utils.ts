export function normalizeShortAnswer(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const PROMPT_OPEN_TAG = "[[prompt]]";
const PROMPT_CLOSE_TAG = "[[/prompt]]";
const CODE_OPEN_TAG = "[[code]]";
const CODE_CLOSE_TAG = "[[/code]]";

export function encodeQuestionPrompt(prompt: string, codeSnippet: string) {
  const trimmedPrompt = prompt.trim();
  const normalizedSnippet = codeSnippet.trim();

  return `${PROMPT_OPEN_TAG}${trimmedPrompt}${PROMPT_CLOSE_TAG}${CODE_OPEN_TAG}${normalizedSnippet}${CODE_CLOSE_TAG}`;
}

export function decodeQuestionPrompt(value: string) {
  const promptStart = value.indexOf(PROMPT_OPEN_TAG);
  const promptEnd = value.indexOf(PROMPT_CLOSE_TAG);
  const codeStart = value.indexOf(CODE_OPEN_TAG);
  const codeEnd = value.indexOf(CODE_CLOSE_TAG);

  const hasTaggedPrompt =
    promptStart !== -1 &&
    promptEnd !== -1 &&
    codeStart !== -1 &&
    codeEnd !== -1 &&
    promptStart < promptEnd &&
    codeStart < codeEnd;

  if (!hasTaggedPrompt) {
    return {
      prompt: value,
      codeSnippet: "",
    };
  }

  return {
    prompt: value
      .slice(promptStart + PROMPT_OPEN_TAG.length, promptEnd)
      .trim(),
    codeSnippet: value.slice(codeStart + CODE_OPEN_TAG.length, codeEnd),
  };
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
