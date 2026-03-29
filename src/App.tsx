import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowRight, Hash } from "lucide-react";
import { Link, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const joinQuizSchema = z.object({
  quizId: z
    .string()
    .trim()
    .min(1, "Enter a quiz ID to continue.")
    .regex(/^\d+$/, "Use a whole number.")
    .refine((value) => Number(value) > 0, "Enter a valid quiz ID."),
});

type JoinQuizFormValues = z.infer<typeof joinQuizSchema>;

function App() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinQuizFormValues>({
    resolver: zodResolver(joinQuizSchema),
    defaultValues: {
      quizId: "",
    },
  });

  function handleJoinQuiz(values: JoinQuizFormValues) {
    navigate(`/quiz/${encodeURIComponent(values.quizId)}`);
  }

  return (
    <main className="app-shell relative isolate justify-center overflow-hidden py-6 sm:py-10">
      <div className="page-gradient" />
      <div className="pointer-events-none absolute inset-x-6 top-24 -z-10 h-64 rounded-full bg-sky-200/20 blur-3xl" />

      <section className="glass-panel relative overflow-hidden border-white/70 px-6 py-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10 lg:px-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Build a quiz in one lane, join it from another.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Create polished quiz sessions for onboarding, classrooms, and
                team games. Start from the builder when you are hosting, or drop
                in with a quiz ID when you are ready to play.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Link to="/builder">
                  Create quiz
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Card
            id="join-quiz"
            className="rounded-[2rem] border border-slate-200/80 bg-white/90 py-0 shadow-[0_16px_55px_-40px_rgba(15,23,42,0.55)]"
          >
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-2xl font-semibold text-slate-950">
                Enter your quiz ID
              </CardTitle>
              <CardDescription className="max-w-md text-sm leading-6 text-slate-600">
                Paste the code shared by your host and jump directly into the
                quiz session.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form
                className="space-y-4"
                onSubmit={handleSubmit(handleJoinQuiz)}
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="quiz-id" className="text-slate-700">
                    Quiz ID
                  </Label>
                  <div className="relative">
                    <Hash className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="quiz-id"
                      placeholder="Example: 3"
                      aria-invalid={errors.quizId ? "true" : "false"}
                      aria-describedby={
                        errors.quizId ? "quiz-id-error" : undefined
                      }
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-sky-400 focus-visible:ring-sky-200"
                      {...register("quizId")}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Spaces at the beginning or end are removed automatically.
                  </p>
                  {errors.quizId ? (
                    <p
                      id="quiz-id-error"
                      className="text-xs font-medium text-rose-600"
                    >
                      {errors.quizId.message}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full rounded-full bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Take quiz
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

export default App;
