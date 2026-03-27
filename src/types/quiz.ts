export type Quiz = {
  id: number;
  title: string;
  description: string;
  timeLimitSeconds: number;
  isPublished: boolean;
};

export type QuestionType = "mcq" | "short";

export type Question = {
  id: number;
  quizId: number;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  position: number;
};
