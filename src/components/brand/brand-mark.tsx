import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
};

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span aria-hidden="true" className="relative size-10 shrink-0 overflow-hidden rounded-xl shadow-sm">
        <Image src="/icons/icon-192.png?v=3" alt="" width={40} height={40} unoptimized className="size-10 dark:hidden" />
        <Image src="/icons/icon-dark-192.png?v=3" alt="" width={40} height={40} unoptimized className="hidden size-10 dark:block" />
      </span>
      {!compact && (
        <span className="text-lg font-bold tracking-[-0.02em]">
          Monii App
        </span>
      )}
    </div>
  );
}
