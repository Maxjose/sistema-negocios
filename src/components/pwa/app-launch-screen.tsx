"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";

export function AppLaunchScreen() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 700);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <div aria-label="Cargando Sistema Negocios" aria-live="polite" className="fixed inset-0 z-[100] grid place-items-center bg-background text-foreground motion-safe:animate-launch-fade">
      <div className="flex flex-col items-center">
        <BrandMark />
        <div className="mt-7 h-1 w-32 overflow-hidden rounded-full bg-accent">
          <div className="h-full w-1/2 rounded-full bg-brand motion-safe:animate-launch-progress" />
        </div>
        <p className="mt-3 text-xs font-medium text-muted">Preparando tu negocio...</p>
      </div>
    </div>
  );
}
