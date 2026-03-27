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
