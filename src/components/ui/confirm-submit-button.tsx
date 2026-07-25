"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

export function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
  pendingLabel = "Procesando...",
}: {
  children: React.ReactNode;
  className?: string;
  confirmMessage: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
