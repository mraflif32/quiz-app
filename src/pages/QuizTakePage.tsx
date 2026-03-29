import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  LoaderCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import dayjs from "@/lib/dayjs";
import {
  createAttempt,
  recordAttemptEvent,
  saveAttemptAnswer,
  submitAttempt,
} from "@/lib/quiz-api";
import { decodeQuestionPrompt, getErrorMessage } from "@/lib/quiz-utils";
import type { Attempt, AttemptResult } from "@/types/api";
import type { Question } from "@/types/quiz";

type AntiCheatEvent = {
  event: string;
  timestamp: string;
};

function formatTimeLeft(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getAnswerMap(attempt: Attempt) {
  return Object.fromEntries(
    attempt.answers.map((answer) => [answer.questionId, answer.answer]),
  ) as Record<number, string>;
}

function getQuestionLabel(question: Question, fallbackIndex: number) {
  const decodedPrompt = decodeQuestionPrompt(question.prompt);
  return decodedPrompt.prompt || `Question ${fallbackIndex + 1}`;
}

function QuizTakePage() {
  const { quizId: quizIdParam = "" } = useParams();
  const parsedQuizId = Number(quizIdParam);
  const hasValidQuizId =
    Number.isInteger(parsedQuizId) &&
    Number.isFinite(parsedQuizId) &&
    parsedQuizId > 0;

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<number, string>>({});
  const [eventList, setEventList] = useState<AntiCheatEvent[]>([]);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [nowUtcMs, setNowUtcMs] = useState(() => dayjs.utc().valueOf());
  const [isTimeoutSubmitRetrying, setIsTimeoutSubmitRetrying] = useState(false);
  const [retryCountdownSeconds, setRetryCountdownSeconds] = useState(5);
  const startedAttemptQuizIdRef = useRef<number | null>(null);
  const autoSubmitTriggeredRef = useRef(false);
  const lastBlurEventAtRef = useRef(0);
  const lastSubmitOriginRef = useRef<"manual" | "timeout" | null>(null);
  const hasCurrentAttempt = attempt?.quizId === parsedQuizId;

  const orderedQuestions = useMemo(
    () =>
      hasCurrentAttempt && attempt
        ? [...attempt.quiz.questions].sort(
            (left, right) => left.position - right.position,
          )
        : [],
    [attempt, hasCurrentAttempt],
  );

  const currentQuestion =
    orderedQuestions.find((question) => question.id === activeQuestionId) ??
    orderedQuestions[0] ??
    null;

  const startedAtUtc = useMemo(() => {
    if (!attempt) {
      return null;
    }

    const parsedStartedAt = dayjs.utc(attempt.startedAt);

    return parsedStartedAt.isValid() ? parsedStartedAt : null;
  }, [attempt]);

  const hasTimer = Boolean(attempt && attempt.quiz.timeLimitSeconds > 0);
  const deadlineUtc = useMemo(() => {
    if (!attempt || !hasTimer || startedAtUtc === null) {
      return null;
    }

    return startedAtUtc.add(attempt.quiz.timeLimitSeconds, "second");
  }, [attempt, hasTimer, startedAtUtc]);

  const deadlineMs = deadlineUtc?.valueOf() ?? null;
  const nowUtc = useMemo(() => dayjs.utc(nowUtcMs), [nowUtcMs]);
  const timeLeftSeconds =
    deadlineUtc !== null
      ? Math.max(0, Math.ceil(deadlineUtc.diff(nowUtc) / 1000))
      : null;
  const totalPasteEvents = eventList.filter(
    (eventItem) => eventItem.event === "short-answer-paste",
  ).length;
  const totalBlurEvents = eventList.filter(
    (eventItem) => eventItem.event === "window-blur",
  ).length;

  useEffect(() => {
    startedAttemptQuizIdRef.current = null;
    autoSubmitTriggeredRef.current = false;
    lastBlurEventAtRef.current = 0;
    lastSubmitOriginRef.current = null;
  }, [parsedQuizId]);

  const startAttemptMutation = useMutation({
    mutationFn: createAttempt,
    onSuccess: (nextAttempt) => {
      setAttempt(nextAttempt);
      setDraftAnswers(getAnswerMap(nextAttempt));
      setEventList([]);
      setResult(null);
      setIsResultOpen(false);
      setIsTimeoutSubmitRetrying(false);
      setRetryCountdownSeconds(5);
      setNowUtcMs(dayjs.utc().valueOf());
      setActiveQuestionId(
        [...nextAttempt.quiz.questions].sort(
          (left, right) => left.position - right.position,
        )[0]?.id ?? null,
      );
    },
  });

  const saveAnswerMutation = useMutation({
    mutationFn: ({
      questionId,
      answer,
    }: {
      questionId: number;
      answer: string;
    }) => {
      if (!attempt) {
        throw new Error("Attempt not ready.");
      }

      return saveAttemptAnswer(attempt.id, {
        attemptId: attempt.id,
        questionId,
        value: answer,
      });
    },
    onSuccess: (_, variables) => {
      setAttempt((currentAttempt) => {
        if (!currentAttempt) {
          return currentAttempt;
        }

        const otherAnswers = currentAttempt.answers.filter(
          (answer) => answer.questionId !== variables.questionId,
        );

        return {
          ...currentAttempt,
          answers: [
            ...otherAnswers,
            {
              questionId: variables.questionId,
              answer: variables.answer,
            },
          ],
        };
      });
      toast.success("Answer saved");
    },
  });

  const trackEventMutation = useMutation({
    mutationFn: ({ event }: { event: string }) => {
      if (!attempt) {
        throw new Error("Attempt not ready.");
      }

      return recordAttemptEvent(attempt.id, {
        attemptId: attempt.id,
        event,
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!attempt) {
        throw new Error("Attempt not ready.");
      }

      return submitAttempt(attempt.id);
    },
    onSuccess: (attemptResult) => {
      setAttempt((currentAttempt) =>
        currentAttempt
          ? {
              ...currentAttempt,
              submittedAt: dayjs.utc().toISOString(),
            }
          : currentAttempt,
      );
      setIsTimeoutSubmitRetrying(false);
      setRetryCountdownSeconds(5);
      setResult(attemptResult);
      setIsResultOpen(true);
      toast.success("Quiz submitted");
    },
    onError: () => {
      if (lastSubmitOriginRef.current === "timeout") {
        setIsTimeoutSubmitRetrying(true);
        setRetryCountdownSeconds(5);
      }
    },
  });

  const isSubmitted = Boolean(attempt?.submittedAt);
  const isReadOnly =
    isSubmitted ||
    saveAnswerMutation.isPending ||
    submitMutation.isPending ||
    isTimeoutSubmitRetrying;

  useEffect(() => {
    if (!hasValidQuizId) {
      return;
    }

    if (startedAttemptQuizIdRef.current === parsedQuizId) {
      return;
    }

    startedAttemptQuizIdRef.current = parsedQuizId;
    startAttemptMutation.mutate(parsedQuizId);
  }, [hasValidQuizId, parsedQuizId, startAttemptMutation]);

  useEffect(() => {
    if (deadlineMs === null || isReadOnly) {
      return;
    }

    const interval = window.setInterval(() => {
      setNowUtcMs(dayjs.utc().valueOf());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [deadlineMs, isReadOnly]);

  useEffect(() => {
    if (
      !attempt ||
      deadlineMs === null ||
      timeLeftSeconds !== 0 ||
      isReadOnly
    ) {
      return;
    }

    if (autoSubmitTriggeredRef.current) {
      return;
    }

    autoSubmitTriggeredRef.current = true;
    lastSubmitOriginRef.current = "timeout";
    submitMutation.mutate();
  }, [attempt, deadlineMs, isReadOnly, submitMutation, timeLeftSeconds]);

  useEffect(() => {
    if (!isTimeoutSubmitRetrying || isSubmitted) {
      return;
    }

    if (retryCountdownSeconds > 0) {
      const countdownTimeout = window.setTimeout(() => {
        setRetryCountdownSeconds((currentSeconds) => currentSeconds - 1);
      }, 1000);

      return () => window.clearTimeout(countdownTimeout);
    }

    const retryTimeout = window.setTimeout(() => {
      lastSubmitOriginRef.current = "timeout";
      submitMutation.mutate();
      setRetryCountdownSeconds(5);
    }, 0);

    return () => window.clearTimeout(retryTimeout);
  }, [
    isSubmitted,
    isTimeoutSubmitRetrying,
    retryCountdownSeconds,
    submitMutation,
  ]);

  const logAntiCheatEvent = useCallback((event: string) => {
    const timestamp = dayjs.utc().toISOString();

    setEventList((currentEvents) => [
      ...currentEvents,
      {
        event,
        timestamp,
      },
    ]);
  }, []);

  useEffect(() => {
    if (!attempt || isReadOnly || activeQuestionId === null) {
      return;
    }

    function incrementBlurCount() {
      const nowTimestamp = dayjs.utc().valueOf();

      if (nowTimestamp - lastBlurEventAtRef.current < 400) {
        return;
      }

      lastBlurEventAtRef.current = nowTimestamp;

      logAntiCheatEvent("window-blur");
      trackEventMutation.mutate({ event: "window-blur" });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        incrementBlurCount();
      }
    }

    window.addEventListener("blur", incrementBlurCount);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", incrementBlurCount);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeQuestionId, attempt, isReadOnly, logAntiCheatEvent, trackEventMutation]);

  function handleRetryStart() {
    startedAttemptQuizIdRef.current = null;
    startAttemptMutation.reset();
    startAttemptMutation.mutate(parsedQuizId);
  }

  function updateDraftAnswer(questionId: number, answer: string) {
    setDraftAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: answer,
    }));
  }

  function handleSaveCurrentAnswer() {
    if (!currentQuestion || isReadOnly) {
      return;
    }

    const draftAnswer = draftAnswers[currentQuestion.id] ?? "";
    const answer = currentQuestion.type === "short" ? draftAnswer : draftAnswer;

    saveAnswerMutation.mutate({
      questionId: currentQuestion.id,
      answer,
    });
  }

  function handleShortAnswerPaste() {
    if (!currentQuestion || isReadOnly) {
      return;
    }

    logAntiCheatEvent("short-answer-paste");
    if (attempt) {
      trackEventMutation.mutate({ event: "short-answer-paste" });
    }
  }

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
                The quiz route needs a positive numeric quiz ID.
              </AlertDescription>
            </Alert>
            <Button
              asChild
              className="mt-4 rounded-full bg-slate-950 text-white"
            >
              <Link to="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (startAttemptMutation.isError) {
    return (
      <main className="app-shell relative isolate justify-center overflow-hidden py-6 sm:py-10">
        <div className="page-gradient" />
        <Card className="rounded-[2rem] border border-white/80 bg-white/85 py-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <CardContent className="px-6 py-8">
            <Alert
              variant="destructive"
              className="rounded-2xl border-rose-200 bg-rose-50"
            >
              <AlertTitle>Could not start the quiz</AlertTitle>
              <AlertDescription>
                {getErrorMessage(
                  startAttemptMutation.error,
                  "Please try again.",
                )}
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={handleRetryStart}
                className="rounded-full bg-slate-950 text-white"
              >
                Try again
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full bg-white"
              >
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (startAttemptMutation.isPending || !hasCurrentAttempt || !attempt) {
    return (
      <main className="app-shell relative isolate justify-center overflow-hidden py-6 sm:py-10">
        <div className="page-gradient" />
        <Card className="rounded-[2rem] border border-white/80 bg-white/85 py-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <CardContent className="flex items-center gap-3 px-6 py-10 text-sm text-slate-600">
            <LoaderCircle className="size-5 animate-spin text-sky-600" />
            Starting your quiz attempt...
          </CardContent>
        </Card>
      </main>
    );
  }

  const activeAnswer =
    currentQuestion !== null ? (draftAnswers[currentQuestion.id] ?? "") : "";

  function handleManualSubmit() {
    lastSubmitOriginRef.current = "manual";
    submitMutation.mutate();
  }

  return (
    <>
      <main className="app-shell relative isolate overflow-hidden py-6 sm:py-10">
        <div className="page-gradient" />
        <div className="pointer-events-none absolute inset-x-6 top-24 -z-10 h-64 rounded-full bg-sky-200/20 blur-3xl" />

        <section className="glass-panel relative overflow-hidden border-white/70 px-6 py-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-sky-600 px-3 text-[0.65rem] font-semibold text-white hover:bg-sky-500">
                  Quiz in progress
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-300/80 bg-white/70 px-3 text-[0.65rem] text-slate-600"
                >
                  Attempt #{attempt.id}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-300/80 bg-white/70 px-3 text-[0.65rem] text-slate-600"
                >
                  Quiz ID {attempt.quizId}
                </Badge>
              </div>
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950">
                {attempt.quiz.title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                {attempt.quiz.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Card className="rounded-[1.5rem] border border-white/80 bg-white/85 py-0 shadow-sm backdrop-blur">
                <CardContent className="flex items-center gap-3 px-4 py-4">
                  <Clock3 className="size-5 text-sky-600" />
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Time left
                    </p>
                    <p className="text-lg font-semibold text-slate-950">
                      {!hasTimer
                        ? "No limit"
                        : timeLeftSeconds === null
                          ? "Timer unavailable"
                          : formatTimeLeft(timeLeftSeconds)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Button
                  type="button"
                  size="lg"
                  disabled={isReadOnly}
                  onClick={handleManualSubmit}
                  className="h-12 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitMutation.isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Finishing...
                    </>
                  ) : (
                    "Submit quiz"
                  )}
                </Button>
                {isTimeoutSubmitRetrying ? (
                  <p className="text-xs font-medium text-amber-700 sm:self-center">
                    Retrying in {retryCountdownSeconds}s
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[2rem] border border-slate-200/80 bg-slate-950 py-0 text-slate-50 shadow-[0_16px_55px_-42px_rgba(15,23,42,0.6)]">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-2xl font-semibold text-white">
                Question List
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-300">
                Move through the quiz and save each answer as you go.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-3">
                {orderedQuestions.map((question) => {
                  const isActive = question.id === currentQuestion?.id;
                  const savedAnswer = attempt.answers.find(
                    (answer) => answer.questionId === question.id,
                  );

                  return (
                    <button
                      key={question.id}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setActiveQuestionId(question.id)}
                      className={[
                        "w-full rounded-2xl border px-4 py-4 text-left transition-colors",
                        isActive
                          ? "border-amber-300 bg-amber-300/10"
                          : "border-white/10 bg-white/5 hover:bg-white/8",
                        isReadOnly ? "cursor-not-allowed opacity-75" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Question {question.position}
                          </p>
                          {/* <p className="mt-2 text-sm font-semibold text-white">
                            {getQuestionLabel(question, index)}
                          </p> */}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant="outline"
                            className="rounded-full border-white/10 bg-white/5 text-slate-200"
                          >
                            {question.type}
                          </Badge>
                          {savedAnswer ? (
                            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                              Saved
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/80 bg-white/85 py-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-2xl font-semibold text-slate-950">
                {currentQuestion
                  ? `Question ${currentQuestion.position}`
                  : "No question selected"}
                {/* {currentQuestion
                  ? getQuestionLabel(
                      currentQuestion,
                      orderedQuestions.findIndex(
                        (question) => question.id === currentQuestion.id,
                      ),
                    )
                  : "No question selected"} */}
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Review the prompt, answer carefully, and save when you are
                ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-6">
              {currentQuestion ? (
                <>
                  <div className="space-y-3">
                    {/* <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-sky-600 px-3 text-[0.65rem] font-semibold text-white hover:bg-sky-500">
                        Question{" "}
                        {orderedQuestions.findIndex(
                          (question) => question.id === currentQuestion.id,
                        ) + 1}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="rounded-full border-slate-200 bg-white/70 px-3 text-[0.65rem] text-slate-600"
                      >
                        Position {currentQuestion.position}
                      </Badge>
                    </div> */}

                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
                      <p className="text-base leading-7 text-slate-900">
                        {decodeQuestionPrompt(currentQuestion.prompt).prompt}
                      </p>
                    </div>

                    {decodeQuestionPrompt(currentQuestion.prompt)
                      .codeSnippet ? (
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-inner">
                        <div className="mb-3 flex items-center gap-2 text-slate-300">
                          <Copy className="size-4" />
                          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em]">
                            Code snippet
                          </span>
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-6">
                          <code>
                            {
                              decodeQuestionPrompt(currentQuestion.prompt)
                                .codeSnippet
                            }
                          </code>
                        </pre>
                      </div>
                    ) : null}
                  </div>

                  {currentQuestion.type === "mcq" ? (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => {
                        const isSelected = activeAnswer === option;

                        return (
                          <button
                            key={`${currentQuestion.id}-${index}`}
                            type="button"
                            disabled={isReadOnly}
                            onClick={() =>
                              updateDraftAnswer(currentQuestion.id, option)
                            }
                            className={[
                              "flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors",
                              isSelected
                                ? "border-sky-500 bg-sky-50"
                                : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                              isReadOnly ? "cursor-not-allowed opacity-80" : "",
                            ].join(" ")}
                          >
                            <span className="text-sm font-medium text-slate-900">
                              {option}
                            </span>
                            {isSelected ? (
                              <CheckCircle2 className="size-5 text-sky-600" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Textarea
                        value={activeAnswer}
                        onChange={(event) =>
                          updateDraftAnswer(
                            currentQuestion.id,
                            event.target.value,
                          )
                        }
                        onPaste={handleShortAnswerPaste}
                        disabled={isReadOnly}
                        className="min-h-36 rounded-2xl bg-slate-50"
                        placeholder="Type your answer here"
                      />
                      {/* <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>Pastes: {activeCounts.pasteCount}</span>
                        <span>Tab changes: {activeCounts.blurCount}</span>
                        <span>
                          Normalized preview:{" "}
                          {activeAnswer.trim()
                            ? normalizeShortAnswer(activeAnswer)
                            : "None yet"}
                        </span>
                      </div> */}
                    </div>
                  )}

                  <Separator />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      size="lg"
                      disabled={isReadOnly || saveAnswerMutation.isPending}
                      onClick={handleSaveCurrentAnswer}
                      className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {saveAnswerMutation.isPending ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Saving answer...
                        </>
                      ) : (
                        "Save answer"
                      )}
                    </Button>

                    {attempt.answers.find(
                      (answer) => answer.questionId === currentQuestion.id,
                    ) ? (
                      <p className="text-sm font-medium text-emerald-700">
                        Answer saved for this question.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Save your answer before moving on if you want it
                        persisted immediately.
                      </p>
                    )}
                  </div>

                  {saveAnswerMutation.isError ? (
                    <Alert
                      variant="destructive"
                      className="rounded-2xl border-rose-200 bg-rose-50"
                    >
                      <AlertTitle>Answer was not saved</AlertTitle>
                      <AlertDescription>
                        {getErrorMessage(
                          saveAnswerMutation.error,
                          "Please try the save again.",
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </>
              ) : (
                <Alert className="rounded-2xl border-slate-200 bg-slate-50">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>No questions available</AlertTitle>
                  <AlertDescription>
                    This quiz does not have any questions yet.
                  </AlertDescription>
                </Alert>
              )}

              {submitMutation.isError ? (
                <Alert
                  variant="destructive"
                  className="rounded-2xl border-rose-200 bg-rose-50"
                >
                  <AlertTitle>Quiz was not submitted</AlertTitle>
                  <AlertDescription>
                    {isTimeoutSubmitRetrying
                      ? `${getErrorMessage(
                          submitMutation.error,
                          "Retrying submission automatically.",
                        )} Retrying automatically.`
                      : getErrorMessage(
                          submitMutation.error,
                          "Please try submitting again.",
                        )}
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </main>

      <Dialog
        open={isResultOpen && hasCurrentAttempt}
        onOpenChange={setIsResultOpen}
      >
        <DialogContent className="overflow-hidden overflow-y-scroll max-h-[calc(100vh-4rem)]">
          <div className="page-gradient absolute inset-0 opacity-70" />
          <div className="relative space-y-6 px-6 py-6 sm:px-8 sm:py-8">
            <DialogHeader>
              {/* <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-emerald-600 px-3 text-[0.65rem] font-semibold text-white hover:bg-emerald-500">
                  Results ready
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-300/80 bg-white/70 px-3 text-[0.65rem] text-slate-600"
                >
                  Attempt #{attempt.id}
                </Badge>
              </div> */}
              <DialogTitle>Your quiz is finished</DialogTitle>
              <DialogDescription>
                Review your score and see which questions were marked correct.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-sm">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Score
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {result?.score ?? 0}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Evaluated across {result?.details.length ?? 0} questions.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5 shadow-sm">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Anti-cheat events
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Paste events
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {totalPasteEvents}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Tab changes
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {totalBlurEvents}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {(result?.details ?? []).map((detail, index) => {
                const matchedQuestion = orderedQuestions.find(
                  (question) => question.id === detail.questionId,
                );

                return (
                  <div
                    key={`${detail.questionId}-${index}`}
                    className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {matchedQuestion
                            ? getQuestionLabel(matchedQuestion, index)
                            : `Question ${detail.questionId}`}
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          Expected answer
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {detail.expected}
                        </p>
                      </div>
                      <Badge
                        className={[
                          "rounded-full px-3 text-[0.65rem] font-semibold text-white",
                          detail.correct ? "bg-emerald-600" : "bg-rose-600",
                        ].join(" ")}
                      >
                        {detail.correct ? "Correct" : "Incorrect"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResultOpen(false)}
                className="rounded-full bg-white"
              >
                Close results
              </Button>
              <Button asChild className="rounded-full bg-slate-950 text-white">
                <Link to="/">Back to home</Link>
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default QuizTakePage;
