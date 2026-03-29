import { lazy } from "react";

export const AppPage = lazy(() => import("../App.tsx"));
export const BuilderEntryPage = lazy(
  () => import("../pages/BuilderEntryPage.tsx"),
);
export const QuizBuilderPage = lazy(
  () => import("../pages/QuizBuilderPage.tsx"),
);
export const QuizTakePage = lazy(() => import("../pages/QuizTakePage.tsx"));
