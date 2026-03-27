"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { cn } from "@/lib/utils";

function Toaster({ className, ...props }: ToasterProps) {
  return (
    <Sonner
      className={cn("toaster group", className)}
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-lg",
          title: "text-sm font-semibold",
          description: "text-xs text-slate-600",
          actionButton:
            "bg-slate-950 text-white hover:bg-slate-800 rounded-full",
          cancelButton:
            "bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-full",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
