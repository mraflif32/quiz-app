import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import BuilderEntryPage from "./pages/BuilderEntryPage.tsx";
import QuizBuilderPage from "./pages/QuizBuilderPage.tsx";
import QuizTakePage from "./pages/QuizTakePage.tsx";
import { BrowserRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/sonner.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/builder" element={<BuilderEntryPage />} />
          <Route path="/builder/:quizId" element={<QuizBuilderPage />} />
          <Route path="/quiz/:quizId" element={<QuizTakePage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
);
