"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <button aria-label="Cambiar tema claro u oscuro" className="grid size-10 place-items-center rounded-xl border bg-surface text-muted transition hover:text-brand" onClick={toggle} type="button">
      <Moon className="size-4 dark:hidden" /><Sun className="hidden size-4 dark:block" />
    </button>
  );
}
