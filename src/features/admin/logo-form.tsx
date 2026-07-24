"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  uploadBusinessLogo,
  type AdminActionState,
} from "@/features/admin/actions";

const initialState: AdminActionState = {};

export function LogoForm({ businessId }: { businessId: string }) {
  const [state, formAction, pending] = useActionState(
    uploadBusinessLogo.bind(null, businessId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input
        accept="image/jpeg,image/png,image/webp"
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-brand-strong"
        name="logo"
        required
        type="file"
      />
      <p className="text-xs text-muted">JPG, PNG o WebP. Máximo 5 MB.</p>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {!state.error && !pending && state && null}
      <Button disabled={pending} type="submit" variant="secondary">
        {pending ? "Subiendo..." : "Actualizar logotipo"}
      </Button>
    </form>
  );
}
