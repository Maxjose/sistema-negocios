"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { setBusinessAccent } from "@/features/catalog/actions";
import type { AccentTheme } from "@/features/catalog/types";

const options: Array<{ id: AccentTheme; label: string; colors: string }> = [
  { id: "emerald", label: "Esmeralda", colors: "from-emerald-500 to-emerald-700" },
  { id: "blue", label: "Azul", colors: "from-blue-500 to-blue-700" },
  { id: "violet", label: "Violeta", colors: "from-violet-500 to-violet-700" },
  { id: "rose", label: "Rosa", colors: "from-rose-500 to-rose-700" },
  { id: "amber", label: "Ámbar", colors: "from-amber-400 to-amber-600" },
  { id: "cyan", label: "Cian", colors: "from-cyan-400 to-cyan-700" },
];

export function AccentThemePicker({ initialTheme }: { initialTheme: AccentTheme }) {
  const [selected, setSelected] = useState(initialTheme);
  const [pending, startTransition] = useTransition();
  const choose = (theme: AccentTheme) => {
    const previous = selected;
    setSelected(theme);
    document.querySelector<HTMLElement>("[data-app-shell]")?.setAttribute("data-accent", theme);
    startTransition(async () => {
      try { await setBusinessAccent(theme); }
      catch {
        setSelected(previous);
        document.querySelector<HTMLElement>("[data-app-shell]")?.setAttribute("data-accent", previous);
      }
    });
  };
  return (
    <section className="mt-6 rounded-2xl border bg-surface p-5">
      <h3 className="font-bold">Color de acento</h3>
      <p className="mt-1 text-sm text-muted">Personaliza botones, enlaces y elementos destacados en los modos claro y oscuro.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {options.map((option) => {
          const active = selected === option.id;
          return <button aria-pressed={active} className={`relative rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${active ? "ring-2 ring-brand ring-offset-2 ring-offset-surface" : ""}`} disabled={pending} key={option.id} onClick={() => choose(option.id)} type="button">
            <span className={`block h-9 rounded-lg bg-gradient-to-r ${option.colors}`} />
            <span className="mt-2 flex items-center justify-between text-xs font-semibold">{option.label}{active && <Check className="size-4 text-brand" />}</span>
          </button>;
        })}
      </div>
      <p aria-live="polite" className="mt-3 text-xs text-muted">{pending ? "Guardando preferencia..." : "La preferencia se guarda para todo el negocio."}</p>
    </section>
  );
}
