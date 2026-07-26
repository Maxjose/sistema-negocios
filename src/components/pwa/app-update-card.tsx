"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

type UpdateState = "idle" | "checking" | "ready" | "error";

export function AppUpdateCard() {
  const [state, setState] = useState<UpdateState>("idle");

  const updateApp = async () => {
    setState("checking");
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        await registration?.update();
        if (navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) => {
            const channel = new MessageChannel();
            const timeout = window.setTimeout(resolve, 4000);
            channel.port1.onmessage = () => {
              window.clearTimeout(timeout);
              resolve();
            };
            navigator.serviceWorker.controller?.postMessage({ type: "REFRESH_APP_CACHE" }, [channel.port2]);
          });
        } else if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } else if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      setState("ready");
      window.setTimeout(() => window.location.reload(), 500);
    } catch {
      setState("error");
    }
  };

  return <section className="mt-6 max-w-xl rounded-2xl border bg-surface p-5">
    <div className="flex items-start gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-brand"><RefreshCw className={`size-5 ${state === "checking" ? "animate-spin" : ""}`} /></div>
      <div><h3 className="font-bold">Actualizar aplicación</h3><p className="mt-1 text-sm leading-6 text-muted">Busca la versión más reciente, renueva los archivos guardados y vuelve a cargar Monii App.</p></div>
    </div>
    <button className="mt-5 min-h-11 w-full rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60 sm:w-auto" disabled={state === "checking" || state === "ready"} onClick={updateApp} type="button">{state === "checking" ? "Buscando actualización…" : state === "ready" ? "Actualización lista" : "Actualizar ahora"}</button>
    <p aria-live="polite" className={`mt-3 text-xs ${state === "error" ? "text-red-600 dark:text-red-400" : "text-muted"}`}>{state === "error" ? "No se pudo actualizar. Revisa tu conexión e inténtalo nuevamente." : "La aplicación se recargará automáticamente al terminar."}</p>
  </section>;
}
