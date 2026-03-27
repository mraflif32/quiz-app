import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  Hash,
  Layers3,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const heroStats = [
  { label: "Quick setup", value: "3 min" },
  { label: "Shareable access", value: "Quiz ID" },
  { label: "Built for teams", value: "Live-ready" },
];

const featureHighlights = [
  {
    icon: Layers3,
    title: "Build in layers",
    description: "Shape rounds, prompts, and pacing without losing the flow.",
  },
  {
    icon: TimerReset,
    title: "Launch fast",
    description: "Spin up quizzes for onboarding, events, or a classroom in minutes.",
  },
  {
    icon: CheckCircle2,
    title: "Simple to join",
    description: "Players only need a quiz ID to jump into the experience.",
  },
];

const joinQuizSchema = z.object({
  quizId: z.string().trim().min(1, "Enter a quiz ID to continue."),
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
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.24),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(244,247,251,0.84))]" />
      <div className="pointer-events-none absolute inset-x-6 top-24 -z-10 h-64 rounded-full bg-sky-200/20 blur-3xl" />

      <section className="glass-panel relative overflow-hidden border-white/70 px-6 py-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10 lg:px-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-sky-600 px-3 text-[0.65rem] font-semibold text-white hover:bg-sky-500">
                Quiz flow, simplified
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-slate-300/80 bg-white/70 px-3 text-[0.65rem] text-slate-600"
              >
                Bright, live-ready workspace
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Build a quiz in one lane, join it from another.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Create polished quiz sessions for onboarding, classrooms, and
                team games. Start from the builder when you are hosting, or
                drop in with a quiz ID when you are ready to play.
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
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 rounded-full border-slate-300 bg-white/80 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <a href="#join-quiz">
                  Join with ID
                  <Hash className="size-4" />
                </a>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 shadow-sm shadow-slate-200/30"
                >
                  <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Card className="rounded-[2rem] border border-white/80 bg-white/80 py-0 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader className="px-6 pt-6">
              <div className="mb-3 flex items-center gap-2 text-sky-700">
                <Sparkles className="size-4" />
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
                  Host flow
                </span>
              </div>
              <CardTitle className="text-2xl font-semibold text-slate-950">
                Launch a builder workspace
              </CardTitle>
              <CardDescription className="max-w-sm text-sm leading-6 text-slate-600">
                Draft questions, set the tone, and prepare a shareable quiz
                session from one focused place.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-950 p-5 text-slate-50 shadow-inner">
                <div className="flex items-center justify-between text-[0.65rem] font-medium uppercase tracking-[0.18em] text-slate-400">
                  <span>Builder preview</span>
                  <span>Ready when you are</span>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-white/8 p-3">
                    <p className="text-xs text-slate-300">Round 1</p>
                    <p className="mt-1 text-sm font-medium">
                      Quick-fire icebreakers
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/8 p-3">
                    <p className="text-xs text-slate-300">Round 2</p>
                    <p className="mt-1 text-sm font-medium">
                      Product knowledge challenge
                    </p>
                  </div>
                  <div className="rounded-2xl bg-linear-to-r from-sky-400 to-amber-300 p-3 text-slate-950">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                      Share
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      Publish and send the quiz ID to players
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-200/80 px-6 py-5">
              <Button
                asChild
                size="lg"
                className="h-11 w-full rounded-full bg-sky-600 text-sm font-semibold text-white hover:bg-sky-500"
              >
                <Link to="/builder">
                  Open builder
                  <FilePlus2 className="size-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card
          id="join-quiz"
          className="rounded-[2rem] border border-slate-200/80 bg-white/90 py-0 shadow-[0_16px_55px_-40px_rgba(15,23,42,0.55)]"
        >
          <CardHeader className="px-6 pt-6">
            <Badge
              variant="outline"
              className="w-fit rounded-full border-emerald-200 bg-emerald-50 px-3 text-[0.65rem] font-semibold text-emerald-700"
            >
              Join a live quiz
            </Badge>
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
                    placeholder="Example: TEAM-QUIZ-204"
                    aria-invalid={errors.quizId ? "true" : "false"}
                    aria-describedby={errors.quizId ? "quiz-id-error" : undefined}
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

        <Card className="rounded-[2rem] border border-slate-200/80 bg-slate-950 py-0 text-slate-50 shadow-[0_16px_55px_-42px_rgba(15,23,42,0.6)]">
          <CardHeader className="px-6 pt-6">
            <Badge className="w-fit rounded-full bg-amber-300 px-3 text-[0.65rem] font-semibold text-slate-950 hover:bg-amber-200">
              Why teams use it
            </Badge>
            <CardTitle className="text-2xl font-semibold text-white">
              One home screen for hosts and players
            </CardTitle>
            <CardDescription className="max-w-lg text-sm leading-6 text-slate-300">
              The landing page keeps the next action obvious whether you are
              setting the quiz up or arriving with a code in hand.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6">
            {featureHighlights.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div key={feature.title}>
                  <div className="flex gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-amber-300">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">
                        {feature.title}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  {index < featureHighlights.length - 1 ? (
                    <Separator className="mt-5 bg-white/10" />
                  ) : null}
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="border-t border-white/10 px-6 py-5">
            <p className="text-sm leading-6 text-slate-300">
              Hosting today? Open the builder, publish your quiz, then share
              the ID with your audience.
            </p>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

export default App;
