import { BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
};

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="grid size-10 place-items-center rounded-xl bg-brand text-white shadow-sm">
        <BarChart3 aria-hidden="true" className="size-5" strokeWidth={2.25} />
      </span>
      {!compact && (
        <span className="text-lg font-bold tracking-[-0.02em]">
          Sistema Negocios
        </span>
      )}
    </div>
  );
}
