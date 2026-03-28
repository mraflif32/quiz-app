import type { Question, QuestionType } from "./quiz";

export interface CreateQuizBody {
  title: string;
  description: string;
  timeLimitSeconds: number;
  isPublished: boolean;
}

export interface UpdateQuizBody {
  title: string;
  description: string;
  timeLimitSeconds: number;
  isPublished: boolean;
}

export interface CreateQuestionBody {
  quizId: number;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  position: number;
}

export interface UpdateQuestionBody {
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  position: number;
}

export interface FetchQuizResponseBody {
  id: number;
  title: string;
  description: string;
  timeLimitSeconds: number;
  isPublished: boolean;
  createdAt: string;
  questions: Question[];
}

export interface CreateAttemptBody {
  quizId: number;
}

export interface AttemptAnswer {
  questionId: number;
  answer: string;
}

export interface AttemptQuiz {
  id: number;
  title: string;
  description: string;
  timeLimitSeconds: number;
  questions: Question[];
}

export interface Attempt {
  id: number;
  quizId: number;
  startedAt: string;
  submittedAt: string | null;
  answers: AttemptAnswer[];
  quiz: AttemptQuiz;
}

export interface SaveAttemptAnswerBody {
  attemptId: number;
  questionId: number;
  value: string;
}

export interface AttemptEventBody {
  attemptId: number;
  event: string;
}

export interface AttemptResultDetail {
  questionId: number;
  correct: boolean;
  expected: string;
}

export interface AttemptResult {
  score: number;
  details: AttemptResultDetail[];
}
