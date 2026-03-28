import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  FilePlus2,
  LoaderCircle,
  Plus,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  createQuestion,
  fetchQuiz,
  updateQuestion,
  updateQuiz,
} from "@/lib/quiz-api";
import {
  decodeQuestionPrompt,
  encodeQuestionPrompt,
  getErrorMessage,
  normalizeShortAnswer,
} from "@/lib/quiz-utils";
import type { Question, QuestionType } from "@/types/quiz";
import type {
  CreateQuestionBody,
  FetchQuizResponseBody,
  UpdateQuestionBody,
} from "@/types/api";

const quizDetailsSchema = z.object({
  title: z.string().trim().min(1, "Add a quiz title."),
  description: z.string().trim(),
  timeLimitSeconds: z.coerce
    .number()
    .int("Use a whole number.")
    .positive("Use a positive time limit."),
  isPublished: z.boolean(),
});

const questionOptionSchema = z.object({
  value: z.string(),
});

const questionSchema = z
  .object({
    type: z.enum(["mcq", "short"]),
    prompt: z.string().trim().min(1, "Add a question prompt."),
    codeSnippet: z.string(),
    position: z.coerce
      .number()
      .int("Use a whole number.")
      .positive("Position must be at least 1."),
    options: z.array(questionOptionSchema),
    correctOptionIndex: z.number().int().nullable(),
    shortAnswer: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "mcq") {
      const filledOptions = value.options.filter((option) =>
        option.value.trim(),
      );

      if (filledOptions.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Add at least 2 options.",
          path: ["options"],
        });
      }

      if (value.correctOptionIndex === null) {
        ctx.addIssue({
          code: "custom",
          message: "Choose the correct option.",
          path: ["correctOptionIndex"],
        });
        return;
      }

      const selectedOption = value.options[value.correctOptionIndex];

      if (!selectedOption || !selectedOption.value.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Pick a filled option as the correct answer.",
          path: ["correctOptionIndex"],
        });
      }
    }

    if (
      value.type === "short" &&
      normalizeShortAnswer(value.shortAnswer).length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Add the accepted answer.",
        path: ["shortAnswer"],
      });
    }
  });

type QuizDetailsValues = z.infer<typeof quizDetailsSchema>;
type QuestionFormValues = z.infer<typeof questionSchema>;

function getOptionDefaultValue(index: number) {
  return `Option ${index + 1}`;
}

function getQuestionDefaults(position: number): QuestionFormValues {
  return {
    type: "mcq",
    prompt: "",
    codeSnippet: "",
    position,
    options: [
      { value: getOptionDefaultValue(0) },
      { value: getOptionDefaultValue(1) },
    ],
    correctOptionIndex: null,
    shortAnswer: "",
  };
}

function mapQuestionToFormValues(question: Question): QuestionFormValues {
  const { prompt, codeSnippet } = decodeQuestionPrompt(question.prompt);

  if (question.type === "short") {
    return {
      type: "short",
      prompt,
      codeSnippet,
      position: question.position,
      options: [{ value: "" }, { value: "" }],
      correctOptionIndex: null,
      shortAnswer: question.correctAnswer,
    };
  }

  return {
    type: "mcq",
    prompt,
    codeSnippet,
    position: question.position,
    options: question.options.length
      ? question.options.map((option) => ({ value: option }))
      : [{ value: "" }, { value: "" }],
    correctOptionIndex: Math.max(
      question.options.findIndex((option) => option === question.correctAnswer),
      0,
    ),
    shortAnswer: "",
  };
}

function buildQuestionPayload(
  quizId: number,
  values: QuestionFormValues,
): CreateQuestionBody {
  const prompt = encodeQuestionPrompt(values.prompt, values.codeSnippet);

  if (values.type === "short") {
    return {
      quizId,
      type: "short",
      prompt,
      options: [],
      correctAnswer: normalizeShortAnswer(values.shortAnswer),
      position: values.position,
    };
  }

  const options = values.options
    .map((option) => option.value.trim())
    .filter(Boolean);
  const selectedOption = values.correctOptionIndex ?? 0;

  return {
    quizId,
    type: "mcq",
    prompt,
    options,
    correctAnswer: options[selectedOption] ?? "",
    position: values.position,
  };
}

function buildQuestionUpdatePayload(
  values: QuestionFormValues,
): UpdateQuestionBody {
  const prompt = encodeQuestionPrompt(values.prompt, values.codeSnippet);

  if (values.type === "short") {
    return {
      type: "short",
      prompt,
      options: [],
      correctAnswer: normalizeShortAnswer(values.shortAnswer),
      position: values.position,
    };
  }

  const options = values.options
    .map((option) => option.value.trim())
    .filter(Boolean);
  const selectedOption = values.correctOptionIndex ?? 0;

  return {
    type: "mcq",
    prompt,
    options,
    correctAnswer: options[selectedOption] ?? "",
    position: values.position,
  };
}

function LoadingCard({ title }: { title: string }) {
  return (
    <Card className="rounded-[2rem] border border-white/80 bg-white/85 py-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardContent className="flex items-center gap-3 px-6 py-10 text-sm text-slate-600">
        <LoaderCircle className="size-5 animate-spin text-sky-600" />
        {title}
      </CardContent>
    </Card>
  );
}

function QuizBuilderPage() {
  const { quizId: quizIdParam = "" } = useParams();
  const parsedQuizId = Number(quizIdParam);
  const hasValidQuizId =
    Number.isInteger(parsedQuizId) &&
    Number.isFinite(parsedQuizId) &&
    parsedQuizId > 0;
  const queryClient = useQueryClient();
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const hydratedQuizIdRef = useRef<number | null>(null);
  const hydratedQuestionQuizIdRef = useRef<number | null>(null);

  const quizQuery = useQuery({
    queryKey: ["quiz", parsedQuizId],
    queryFn: () => fetchQuiz(parsedQuizId),
    enabled: hasValidQuizId,
  });

  const quizForm = useForm<QuizDetailsValues>({
    resolver: zodResolver(quizDetailsSchema) as Resolver<QuizDetailsValues>,
    defaultValues: {
      title: "",
      description: "",
      timeLimitSeconds: 60,
      isPublished: false,
    },
    mode: "onChange",
  });

  const questionForm = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema) as Resolver<QuestionFormValues>,
    defaultValues: getQuestionDefaults(1),
    mode: "onChange",
  });

  const {
    fields: optionFields,
    append,
    remove,
    replace,
  } = useFieldArray({
    control: questionForm.control,
    name: "options",
  });

  const questionType = useWatch({
    control: questionForm.control,
    name: "type",
  });
  const correctOptionIndex = useWatch({
    control: questionForm.control,
    name: "correctOptionIndex",
  });

  useEffect(() => {
    if (!quizQuery.data) {
      return;
    }

    if (hydratedQuizIdRef.current === quizQuery.data.id) {
      return;
    }

    hydratedQuizIdRef.current = quizQuery.data.id;
    quizForm.reset({
      title: quizQuery.data.title,
      description: quizQuery.data.description,
      timeLimitSeconds: quizQuery.data.timeLimitSeconds,
      isPublished: quizQuery.data.isPublished,
    });
  }, [quizForm, quizQuery.data]);

  useEffect(() => {
    if (!quizQuery.data) {
      return;
    }

    if (activeQuestionId !== null) {
      const selectedQuestion = quizQuery.data.questions.find(
        (question) => question.id === activeQuestionId,
      );

      if (!selectedQuestion) {
        questionForm.reset(
          getQuestionDefaults(Math.max(quizQuery.data.questions.length + 1, 1)),
        );
      }
      return;
    }

    if (hydratedQuestionQuizIdRef.current === quizQuery.data.id) {
      return;
    }

    hydratedQuestionQuizIdRef.current = quizQuery.data.id;
    questionForm.reset(
      getQuestionDefaults(Math.max(quizQuery.data.questions.length + 1, 1)),
    );
  }, [activeQuestionId, questionForm, quizQuery.data]);

  useEffect(() => {
    if (questionType === "mcq" && optionFields.length < 2) {
      replace([
        { value: getOptionDefaultValue(0) },
        { value: getOptionDefaultValue(1) },
      ]);
    }

    if (questionType === "short") {
      questionForm.setValue("correctOptionIndex", null, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [optionFields.length, questionForm, questionType, replace]);

  const saveQuizMutation = useMutation({
    mutationFn: (values: QuizDetailsValues) => updateQuiz(parsedQuizId, values),
    onSuccess: (quiz) => {
      queryClient.setQueryData<FetchQuizResponseBody | undefined>(
        ["quiz", parsedQuizId],
        (currentQuiz) =>
          currentQuiz
            ? { ...currentQuiz, ...quiz, questions: currentQuiz.questions }
            : undefined,
      );
      hydratedQuizIdRef.current = quiz.id;
      quizForm.reset({
        title: quiz.title,
        description: quiz.description,
        timeLimitSeconds: quiz.timeLimitSeconds,
        isPublished: quiz.isPublished,
      });
      toast.success("Quiz details saved");
    },
  });

  const saveQuestionMutation = useMutation({
    mutationFn: async (values: QuestionFormValues) => {
      if (activeQuestionId) {
        return updateQuestion(
          activeQuestionId,
          buildQuestionUpdatePayload(values),
        );
      }

      return createQuestion(
        parsedQuizId,
        buildQuestionPayload(parsedQuizId, values),
      );
    },
    onSuccess: (question) => {
      queryClient.setQueryData<FetchQuizResponseBody | undefined>(
        ["quiz", parsedQuizId],
        (currentQuiz) => {
          if (!currentQuiz) {
            return currentQuiz;
          }

          const otherQuestions = currentQuiz.questions.filter(
            (currentQuestion) => currentQuestion.id !== question.id,
          );

          return {
            ...currentQuiz,
            questions: [...otherQuestions, question].sort(
              (left, right) => left.position - right.position,
            ),
          };
        },
      );
      setActiveQuestionId(question.id);
      questionForm.reset(mapQuestionToFormValues(question));
      toast.success("Question saved");
    },
  });

  if (!hasValidQuizId) {
    return (
      <main className="app-shell relative isolate justify-center overflow-hidden py-6 sm:py-10">
        <div className="page-gradient" />
        <Card className="rounded-[2rem] border border-white/80 bg-white/85 py-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <CardContent className="px-6 py-8">
            <Alert
              variant="destructive"
              className="rounded-2xl border-rose-200 bg-rose-50"
            >
              <AlertTitle>Invalid quiz ID</AlertTitle>
              <AlertDescription>
                The builder route needs a positive numeric quiz ID.
              </AlertDescription>
            </Alert>
            <Button
              asChild
              className="mt-4 rounded-full bg-slate-950 text-white"
            >
              <Link to="/builder">Back to builder entry</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (quizQuery.isLoading) {
    return (
      <main className="app-shell relative isolate justify-center overflow-hidden py-6 sm:py-10">
        <div className="page-gradient" />
        <div className="grid gap-6">
          <LoadingCard title="Loading quiz details..." />
        </div>
      </main>
    );
  }

  if (quizQuery.isError || !quizQuery.data) {
    return (
      <main className="app-shell relative isolate justify-center overflow-hidden py-6 sm:py-10">
        <div className="page-gradient" />
        <Card className="rounded-[2rem] border border-white/80 bg-white/85 py-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <CardContent className="px-6 py-8">
            <Alert
              variant="destructive"
              className="rounded-2xl border-rose-200 bg-rose-50"
            >
              <AlertTitle>Could not load the builder</AlertTitle>
              <AlertDescription>
                {getErrorMessage(
                  quizQuery.error,
                  "Please retry from the builder entry screen.",
                )}
              </AlertDescription>
            </Alert>
            <Button
              asChild
              className="mt-4 rounded-full bg-slate-950 text-white"
            >
              <Link to="/builder">Back to builder entry</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const orderedQuestions = [...quizQuery.data.questions].sort(
    (left, right) => left.position - right.position,
  );
  const quizSaveDisabled =
    !quizForm.formState.isValid || saveQuizMutation.isPending;
  const questionSaveDisabled =
    !questionForm.formState.isValid || saveQuestionMutation.isPending;
  const draftQuestionPreview =
    activeQuestionId === null
      ? {
          position: questionForm.getValues("position"),
          prompt:
            questionForm.getValues("prompt").trim() || "Untitled question",
          type: questionType,
        }
      : null;

  function handleNewQuestion() {
    setActiveQuestionId(null);
    questionForm.reset(
      getQuestionDefaults(Math.max(orderedQuestions.length + 1, 1)),
    );
  }

  function handleSelectQuestion(question: Question) {
    setActiveQuestionId(question.id);
    questionForm.reset(mapQuestionToFormValues(question));
  }

  function handleSaveQuiz(values: QuizDetailsValues) {
    saveQuizMutation.mutate(values);
  }

  function handleSaveQuestion(values: QuestionFormValues) {
    saveQuestionMutation.mutate(values);
  }

  return (
    <main className="app-shell relative isolate overflow-hidden py-6 sm:py-10">
      <div className="page-gradient" />
      <div className="pointer-events-none absolute inset-x-6 top-24 -z-10 h-64 rounded-full bg-sky-200/20 blur-3xl" />

      <section className="glass-panel relative overflow-hidden border-white/70 px-6 py-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-sky-600 px-3 text-[0.65rem] font-semibold text-white hover:bg-sky-500">
                Quiz builder
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-slate-300/80 bg-white/70 px-3 text-[0.65rem] text-slate-600"
              >
                Quiz ID {quizQuery.data.id}
              </Badge>
            </div>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950">
              Shape the quiz and save each question deliberately.
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Keep quiz details current, then draft each question with clear
              answer rules and an explicit position in the lineup.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-full bg-white/80"
          >
            <Link to="/builder">Open another quiz</Link>
          </Button>
        </div>
      </section>

      <section className="mt-6 space-y-6">
        <Card className="rounded-[2rem] border border-white/80 bg-white/85 py-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <CardHeader className="px-6 pt-6">
            <div className="mb-3 flex items-center gap-2 text-sky-700">
              <Sparkles className="size-4" />
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
                Quiz details
              </span>
            </div>
            <CardTitle className="text-2xl font-semibold text-slate-950">
              Core quiz settings
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Save these separately from your questions so the quiz shell stays
              accurate while you keep editing.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form
              className="space-y-4"
              onSubmit={quizForm.handleSubmit(handleSaveQuiz)}
            >
              <div className="space-y-2">
                <Label htmlFor="quiz-title">Title</Label>
                <Input
                  id="quiz-title"
                  className="h-11 rounded-2xl bg-slate-50"
                  aria-invalid={
                    quizForm.formState.errors.title ? "true" : "false"
                  }
                  {...quizForm.register("title")}
                />
                {quizForm.formState.errors.title ? (
                  <p className="text-xs font-medium text-rose-600">
                    {quizForm.formState.errors.title.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quiz-description">Description</Label>
                <Textarea
                  id="quiz-description"
                  className="min-h-28 rounded-2xl bg-slate-50"
                  {...quizForm.register("description")}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="time-limit">Time limit in seconds</Label>
                  <Input
                    id="time-limit"
                    type="number"
                    min={1}
                    className="h-11 rounded-2xl bg-slate-50"
                    aria-invalid={
                      quizForm.formState.errors.timeLimitSeconds
                        ? "true"
                        : "false"
                    }
                    {...quizForm.register("timeLimitSeconds")}
                  />
                  {quizForm.formState.errors.timeLimitSeconds ? (
                    <p className="text-xs font-medium text-rose-600">
                      {quizForm.formState.errors.timeLimitSeconds.message}
                    </p>
                  ) : null}
                </div>

                <label className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-slate-300"
                    {...quizForm.register("isPublished")}
                  />
                  Published
                </label>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={quizSaveDisabled}
                className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saveQuizMutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Saving quiz...
                  </>
                ) : (
                  "Save quiz details"
                )}
              </Button>
            </form>

            {saveQuizMutation.isError ? (
              <Alert
                variant="destructive"
                className="mt-4 rounded-2xl border-rose-200 bg-rose-50"
              >
                <AlertTitle>Quiz details were not saved</AlertTitle>
                <AlertDescription>
                  {getErrorMessage(
                    saveQuizMutation.error,
                    "Please try the save again.",
                  )}
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[2rem] border border-slate-200/80 bg-slate-950 py-0 text-slate-50 shadow-[0_16px_55px_-42px_rgba(15,23,42,0.6)]">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-2xl font-semibold text-white">
                Question order
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-300">
                Pick a saved question to edit, or start a new one with the next
                available position.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-3">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleNewQuestion}
                  className="h-11 w-full rounded-full bg-amber-300 text-sm font-semibold text-slate-950 hover:bg-amber-200"
                >
                  <Plus className="size-4" />
                  New question
                </Button>

                {draftQuestionPreview ? (
                  <div className="rounded-2xl border border-dashed border-amber-300/60 bg-amber-300/10 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                          Draft position {draftQuestionPreview.position}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {draftQuestionPreview.prompt}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full border-amber-300/40 bg-amber-300/10 text-amber-100"
                      >
                        {draftQuestionPreview.type}
                      </Badge>
                    </div>
                  </div>
                ) : null}

                {orderedQuestions.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">
                    No questions saved yet. Start the first one from the editor.
                  </div>
                ) : (
                  orderedQuestions.map((question) => {
                    const isActive = question.id === activeQuestionId;
                    const decodedQuestion = decodeQuestionPrompt(
                      question.prompt,
                    );

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => handleSelectQuestion(question)}
                        className={[
                          "w-full rounded-2xl border px-4 py-4 text-left transition-colors",
                          isActive
                            ? "border-amber-300 bg-amber-300/10"
                            : "border-white/10 bg-white/5 hover:bg-white/8",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Position {question.position}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-white">
                              {decodedQuestion.prompt || "Untitled question"}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="rounded-full border-white/10 bg-white/5 text-slate-200"
                          >
                            {question.type}
                          </Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/80 bg-white/85 py-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader className="px-6 pt-6">
              <div className="mb-3 flex items-center gap-2 text-sky-700">
                <FilePlus2 className="size-4" />
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
                  Question editor
                </span>
              </div>
              <CardTitle className="text-2xl font-semibold text-slate-950">
                {activeQuestionId
                  ? "Edit saved question"
                  : "Create a new question"}
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Choose the answer style, set the prompt, and save this question
                into the quiz at the position you want.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-6">
              <form
                className="space-y-6"
                onSubmit={questionForm.handleSubmit(handleSaveQuestion)}
              >
                <div className="space-y-3">
                  <Label>Question type</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["mcq", "short"] as QuestionType[]).map((type) => {
                      const isActive = questionType === type;

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            questionForm.setValue("type", type, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });

                            if (type === "mcq") {
                              replace(
                                optionFields.length >= 2
                                  ? optionFields.map((option) => ({
                                      value: option.value,
                                    }))
                                  : [
                                      { value: getOptionDefaultValue(0) },
                                      { value: getOptionDefaultValue(1) },
                                    ],
                              );
                            } else {
                              questionForm.setValue(
                                "correctOptionIndex",
                                null,
                                {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                },
                              );
                            }
                          }}
                          className={[
                            "rounded-2xl border px-4 py-4 text-left transition-colors",
                            isActive
                              ? "border-sky-500 bg-sky-50"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                          ].join(" ")}
                        >
                          <p className="text-sm font-semibold capitalize text-slate-950">
                            {type}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {type === "mcq"
                              ? "Add options and mark the correct one."
                              : "Define a normalized free-text answer."}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question-prompt">Question prompt</Label>
                  <Controller
                    control={questionForm.control}
                    name="prompt"
                    render={({ field }) => (
                      <Textarea
                        id="question-prompt"
                        className="min-h-28 rounded-2xl bg-slate-50"
                        aria-invalid={
                          questionForm.formState.errors.prompt
                            ? "true"
                            : "false"
                        }
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        placeholder="Enter question prompt"
                      />
                    )}
                  />
                  {questionForm.formState.errors.prompt ? (
                    <p className="text-xs font-medium text-rose-600">
                      {questionForm.formState.errors.prompt.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question-code-snippet">
                    Code snippet
                  </Label>
                  <Controller
                    control={questionForm.control}
                    name="codeSnippet"
                    render={({ field }) => (
                      <Textarea
                        id="question-code-snippet"
                        className="min-h-36 rounded-2xl bg-slate-50 font-mono text-sm"
                        placeholder="Optional: add a code snippet shown with this question"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    )}
                  />
                  <p className="text-xs text-slate-500">
                    Optional. The builder stores this separately from the
                    visible question prompt using tagged content inside the
                    backend prompt field.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question-position">Position in quiz</Label>
                  <Controller
                    control={questionForm.control}
                    name="position"
                    render={({ field }) => (
                      <Input
                        id="question-position"
                        type="number"
                        min={1}
                        className="h-11 rounded-2xl bg-slate-50"
                        aria-invalid={
                          questionForm.formState.errors.position
                            ? "true"
                            : "false"
                        }
                        value={String(field.value ?? "")}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          field.onChange(
                            nextValue === "" ? "" : Number(nextValue),
                          );
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    )}
                  />
                  {questionForm.formState.errors.position ? (
                    <p className="text-xs font-medium text-rose-600">
                      {questionForm.formState.errors.position.message}
                    </p>
                  ) : null}
                </div>

                {questionType === "mcq" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>Options</Label>
                        <p className="mt-1 text-xs text-slate-500">
                          Add at least two options, then mark the correct one.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          append({
                            value: getOptionDefaultValue(optionFields.length),
                          })
                        }
                        className="rounded-full bg-white"
                      >
                        <Plus className="size-4" />
                        Add option
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {optionFields.map((field, index) => {
                        const selected = correctOptionIndex === index;

                        return (
                          <div
                            key={field.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  questionForm.setValue(
                                    "correctOptionIndex",
                                    index,
                                    {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    },
                                  )
                                }
                                className="rounded-full text-sky-600"
                                aria-label={`Select option ${index + 1} as correct`}
                              >
                                {selected ? (
                                  <CheckCircle2 className="size-5" />
                                ) : (
                                  <Circle className="size-5" />
                                )}
                              </button>
                              <Input
                                className="h-11 rounded-2xl bg-white"
                                placeholder={`Option ${index + 1}`}
                                {...questionForm.register(
                                  `options.${index}.value`,
                                )}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={optionFields.length <= 2}
                                onClick={() => {
                                  const currentIndex =
                                    questionForm.getValues(
                                      "correctOptionIndex",
                                    );
                                  remove(index);

                                  if (currentIndex === index) {
                                    questionForm.setValue(
                                      "correctOptionIndex",
                                      null,
                                      {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                      },
                                    );
                                  } else if (
                                    currentIndex !== null &&
                                    currentIndex > index
                                  ) {
                                    questionForm.setValue(
                                      "correctOptionIndex",
                                      currentIndex - 1,
                                      {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                      },
                                    );
                                  }
                                }}
                                className="rounded-full text-slate-500 disabled:opacity-40"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {questionForm.formState.errors.options ? (
                      <p className="text-xs font-medium text-rose-600">
                        {questionForm.formState.errors.options.message}
                      </p>
                    ) : null}
                    {questionForm.formState.errors.correctOptionIndex ? (
                      <p className="text-xs font-medium text-rose-600">
                        {
                          questionForm.formState.errors.correctOptionIndex
                            .message
                        }
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="short-answer">Accepted answer</Label>
                    <Controller
                      control={questionForm.control}
                      name="shortAnswer"
                      render={({ field }) => (
                        <Input
                          id="short-answer"
                          className="h-11 rounded-2xl bg-slate-50"
                          placeholder="Example: annual recurring revenue"
                          aria-invalid={
                            questionForm.formState.errors.shortAnswer
                              ? "true"
                              : "false"
                          }
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      )}
                    />
                    <p className="text-xs text-slate-500">
                      Case is ignored and repeated whitespace is normalized
                      before saving.
                    </p>
                    {questionForm.formState.errors.shortAnswer ? (
                      <p className="text-xs font-medium text-rose-600">
                        {questionForm.formState.errors.shortAnswer.message}
                      </p>
                    ) : null}
                  </div>
                )}

                <Separator />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={questionSaveDisabled}
                    className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saveQuestionMutation.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Saving question...
                      </>
                    ) : activeQuestionId ? (
                      "Save question changes"
                    ) : (
                      "Save question"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNewQuestion}
                    className="h-11 rounded-full bg-white"
                  >
                    Reset to new question
                  </Button>
                </div>
              </form>

              {saveQuestionMutation.isError ? (
                <Alert
                  variant="destructive"
                  className="rounded-2xl border-rose-200 bg-rose-50"
                >
                  <AlertTitle>Question was not saved</AlertTitle>
                  <AlertDescription>
                    {getErrorMessage(
                      saveQuestionMutation.error,
                      "Please review the form and try again.",
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

export default QuizBuilderPage;
