import type {
  Attempt,
  AttemptEventBody,
  AttemptResult,
  CreateQuestionBody,
  CreateAttemptBody,
  CreateQuizBody,
  FetchQuizResponseBody,
  SaveAttemptAnswerBody,
  UpdateQuestionBody,
  UpdateQuizBody,
} from "@/types/api";
import type { Question, Quiz } from "@/types/quiz";

type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const apiUrl = import.meta.env.VITE_API_URL?.trim();
const apiToken = import.meta.env.VITE_API_TOKEN?.trim();

if (!apiUrl) {
  throw new Error("Missing VITE_API_URL environment variable.");
}

if (!apiToken) {
  throw new Error("Missing VITE_API_TOKEN environment variable.");
}

function toApiUrl(path: string) {
  const normalizedBaseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

async function request<T>(input: string, init?: ApiRequestInit) {
  const response = await fetch(toApiUrl(input), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
      ...(init?.headers ?? {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  if (!response.ok) {
    let message = "Something went wrong.";

    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
      message = response.status === 404 ? "Resource not found." : message;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function createQuiz() {
  return request<Quiz>("/quizzes", {
    method: "POST",
    body: {
      title: "Untitled Quiz",
      description: "Description",
      timeLimitSeconds: 60,
      isPublished: false,
    } as CreateQuizBody,
  });
}

export function fetchQuiz(quizId: number) {
  return request<FetchQuizResponseBody>(`/quizzes/${quizId}`);
}

export function updateQuiz(quizId: number, values: Omit<Quiz, "id">) {
  return request<Quiz>(`/quizzes/${quizId}`, {
    method: "PATCH",
    body: values as UpdateQuizBody,
  });
}

export function createQuestion(quizId: number, values: CreateQuestionBody) {
  return request<Question>(`/quizzes/${quizId}/questions`, {
    method: "POST",
    body: values,
  });
}

export function updateQuestion(questionId: number, values: UpdateQuestionBody) {
  return request<Question>(`/questions/${questionId}`, {
    method: "PATCH",
    body: values,
  });
}

export function createAttempt(quizId: number) {
  return request<Attempt>("/attempts", {
    method: "POST",
    body: {
      quizId,
    } as CreateAttemptBody,
  });
}

export function saveAttemptAnswer(
  attemptId: number,
  values: SaveAttemptAnswerBody,
) {
  return request<void>(`/attempts/${attemptId}/answer`, {
    method: "POST",
    body: values,
  });
}

export function recordAttemptEvent(
  attemptId: number,
  values: AttemptEventBody,
) {
  return request<void>(`/attempts/${attemptId}/events`, {
    method: "POST",
    body: values,
  });
}

export function submitAttempt(attemptId: number) {
  return request<AttemptResult>(`/attempts/${attemptId}/submit`, {
    method: "POST",
  });
}
