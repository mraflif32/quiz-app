import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle, Search, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
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
import { createQuiz, fetchQuiz } from "@/lib/quiz-api";
import { getErrorMessage } from "@/lib/quiz-utils";

const openQuizSchema = z.object({
  quizId: z
    .string()
    .trim()
    .min(1, "Enter a quiz ID to continue.")
    .regex(/^\d+$/, "Use a whole number.")
    .refine((value) => Number(value) > 0, "Enter a valid quiz ID."),
});

type OpenQuizValues = z.infer<typeof openQuizSchema>;

function BuilderEntryPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<OpenQuizValues>({
    resolver: zodResolver(openQuizSchema),
    defaultValues: {
      quizId: "",
    },
    mode: "onChange",
  });

  const createQuizMutation = useMutation({
    mutationFn: createQuiz,
    onSuccess: (quiz) => {
      navigate(`/builder/${quiz.id}`);
    },
  });

  const openQuizMutation = useMutation({
    mutationFn: async ({ quizId }: OpenQuizValues) => fetchQuiz(Number(quizId)),
    onSuccess: (quiz) => {
      navigate(`/builder/${quiz.id}`);
    },
  });

  const isBusy = createQuizMutation.isPending || openQuizMutation.isPending;

  function handleOpenQuiz(values: OpenQuizValues) {
    openQuizMutation.reset();
    openQuizMutation.mutate(values);
  }

  return (
    <main className="app-shell relative isolate justify-center overflow-hidden py-6 sm:py-10">
      <div className="page-gradient" />
      <div className="pointer-events-none absolute inset-x-6 top-24 -z-10 h-64 rounded-full bg-sky-200/20 blur-3xl" />

      <section className="glass-panel relative overflow-hidden border-white/70 px-6 py-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10 lg:px-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

        <div className="mb-8 space-y-4">
          <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Start a new quiz or jump back into one by ID.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Create a fresh quiz shell, or load an existing quiz to keep shaping
            its metadata and questions from the same bright builder flow.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card className="rounded-[2rem] border border-white/80 bg-white/85 py-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader className="px-6 pt-6">
              <div className="mb-3 flex items-center gap-2 text-sky-700">
                <Sparkles className="size-4" />
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
                  Create
                </span>
              </div>
              <CardTitle className="text-2xl font-semibold text-slate-950">
                New quiz workspace
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Create a new quiz record, then head straight into the editor to
                save details and add questions one by one.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <Button
                type="button"
                size="lg"
                disabled={isBusy}
                onClick={() => createQuizMutation.mutate()}
                className="h-11 w-full rounded-full bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {createQuizMutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Creating quiz...
                  </>
                ) : (
                  <>
                    Create quiz
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              {createQuizMutation.isError ? (
                <Alert
                  variant="destructive"
                  className="mt-4 rounded-2xl border-rose-200 bg-rose-50"
                >
                  <AlertTitle>Could not create quiz</AlertTitle>
                  <AlertDescription>
                    {getErrorMessage(
                      createQuizMutation.error,
                      "Please try again.",
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-slate-200/80 bg-slate-950 py-0 text-slate-50 shadow-[0_16px_55px_-42px_rgba(15,23,42,0.6)]">
            <CardHeader className="px-6 pt-6">
              <div className="mb-3 flex items-center gap-2 text-amber-300">
                <Search className="size-4" />
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
                  Continue editing
                </span>
              </div>
              <CardTitle className="text-2xl font-semibold text-white">
                Open an existing quiz
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-300">
                Enter a quiz ID to load the latest quiz details and question
                list before you keep editing.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form
                className="space-y-4"
                onSubmit={handleSubmit(handleOpenQuiz)}
              >
                <div className="space-y-2">
                  <Label htmlFor="builder-quiz-id" className="text-slate-100">
                    Quiz ID
                  </Label>
                  <Input
                    id="builder-quiz-id"
                    type="number"
                    min={1}
                    placeholder="Example: TEAM-QUIZ-204"
                    aria-invalid={errors.quizId ? "true" : "false"}
                    aria-describedby={
                      errors.quizId ? "builder-quiz-id-error" : undefined
                    }
                    className="h-12 rounded-2xl border-white/10 bg-white/8 text-sm text-white placeholder:text-slate-400 focus-visible:border-sky-300 focus-visible:ring-sky-200"
                    {...register("quizId")}
                  />
                  {errors.quizId ? (
                    <p
                      id="builder-quiz-id-error"
                      className="text-xs font-medium text-rose-300"
                    >
                      {errors.quizId.message}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Use the quiz ID returned by your backend.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isBusy || !isValid}
                  className="h-11 w-full rounded-full bg-amber-300 text-sm font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-60"
                >
                  {openQuizMutation.isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Loading quiz...
                    </>
                  ) : (
                    <>
                      Open quiz
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>

              {openQuizMutation.isError ? (
                <Alert
                  variant="destructive"
                  className="mt-4 rounded-2xl border-rose-500/30 bg-rose-500/10 text-rose-100"
                >
                  <AlertTitle>Quiz not found</AlertTitle>
                  <AlertDescription className="text-rose-100/90">
                    {getErrorMessage(
                      openQuizMutation.error,
                      "Check the quiz ID and try again.",
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

export default BuilderEntryPage;
