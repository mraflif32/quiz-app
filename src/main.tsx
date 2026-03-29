import { Suspense, StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import { Toaster } from "./components/ui/sonner.tsx";
import "./index.css";
import {
  AppPage,
  BuilderEntryPage,
  QuizBuilderPage,
  QuizTakePage,
} from "./lib/lazy-pages.ts";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense
          fallback={
            <main className="app-shell relative isolate justify-center overflow-hidden py-6 sm:py-10">
              <div className="page-gradient" />
              <div className="glass-panel rounded-[2rem] border border-white/70 px-6 py-8 text-sm text-slate-600 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
                Loading page...
              </div>
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<AppPage />} />
            <Route path="/builder" element={<BuilderEntryPage />} />
            <Route path="/builder/:quizId" element={<QuizBuilderPage />} />
            <Route path="/quiz/:quizId" element={<QuizTakePage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
);
