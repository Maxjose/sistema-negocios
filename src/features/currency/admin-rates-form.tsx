"use client";

import { useActionState } from "react";
import { BellRing, RefreshCw } from "lucide-react";
import { refreshRatesNow, setGlobalExchangeRate, testTelegramRateAlert, type CurrencyActionState } from "@/features/currency/actions";

const initialState: CurrencyActionState = {};

export function AdminRatesForm() {
  const [state, action, pending] = useActionState(refreshRatesNow, initialState);
  return <form action={action} className="mt-5"><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} type="submit"><RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />{pending ? "Actualizando..." : "Actualizar ahora"}</button>{state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}{state.success && <p className="mt-3 text-sm text-brand">{state.success}</p>}</form>;
}

export function ManualGlobalRateForm({ quote, current }: { quote: "VES" | "COP"; current: number | null }) {
  const [state, action, pending] = useActionState(setGlobalExchangeRate.bind(null, quote), initialState);
  return <form action={action} className="mt-3 flex flex-wrap items-start gap-2"><input aria-label={`Tasa manual USD/${quote}`} className="h-10 min-w-0 flex-1 rounded-xl border px-3 text-sm" defaultValue={current ?? ""} min="0.00000001" name="rate" required step="0.00000001" type="number" /><button className="h-10 rounded-xl border bg-surface px-3 text-xs font-semibold" disabled={pending} type="submit">{pending ? "Guardando..." : "Corregir"}</button>{state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}{state.success && <p className="w-full text-xs text-brand">{state.success}</p>}</form>;
}

export function TelegramAlertTestForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(testTelegramRateAlert, initialState);
  return <form action={action} className="mt-5"><div className="flex flex-wrap items-center gap-3"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${configured ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-amber-500/30 bg-amber-500/10 text-amber-600"}`}>{configured ? "Telegram configurado" : "Configuración pendiente"}</span><button className="inline-flex min-h-10 items-center gap-2 rounded-xl border bg-surface px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50" disabled={!configured || pending} type="submit"><BellRing className="size-4" />{pending ? "Enviando..." : "Enviar prueba"}</button></div>{state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}{state.success && <p className="mt-3 text-sm text-brand">{state.success}</p>}</form>;
}
