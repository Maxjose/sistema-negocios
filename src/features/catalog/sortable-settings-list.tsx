"use client";
import { GripVertical } from "lucide-react";
import { useState, useTransition } from "react";
import { reorderSettings, toggleCategory, togglePaymentMethod, updateCategory, updatePaymentMethod } from "@/features/catalog/actions";

type Item = { id: string; name: string; is_active: boolean; display_order: number };

export function SortableSettingsList({ items, kind }: { items: Item[]; kind: "categories" | "payment_methods" }) {
  const [ordered, setOrdered] = useState(items);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const move = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const next = [...ordered];
    const from = next.findIndex((item) => item.id === draggedId);
    const to = next.findIndex((item) => item.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrdered(next);
    setDraggedId(null);
    startTransition(async () => {
      try { await reorderSettings(kind, next.map((item) => item.id)); }
      catch { setOrdered(items); }
    });
  };
  return <div className="mt-5"><p aria-live="polite" className="mb-2 text-xs text-muted">{pending ? "Guardando orden..." : "Arrastra los elementos para cambiar el orden."}</p><ul className="divide-y">{ordered.map((item) => {
    const update = kind === "categories" ? updateCategory : updatePaymentMethod;
    const toggle = kind === "categories" ? toggleCategory : togglePaymentMethod;
    return <li className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 py-3 transition ${draggedId === item.id ? "opacity-40" : ""}`} draggable onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDragStart={() => setDraggedId(item.id)} onDrop={() => move(item.id)} key={item.id}>
      <button aria-label={`Arrastrar ${item.name}`} className="row-span-2 cursor-grab touch-none self-center rounded-lg p-2 text-muted active:cursor-grabbing" type="button"><GripVertical className="size-5" /></button>
      <form action={update.bind(null, item.id)} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><input className="h-10 w-full min-w-0 rounded-lg border bg-surface px-2 text-sm" defaultValue={item.name} name="name" required /><input name="display_order" type="hidden" value={item.display_order} /><button className="min-h-9 justify-self-start text-sm font-semibold text-brand sm:px-2" type="submit">Guardar</button></form>
      <form action={toggle.bind(null, item.id, !item.is_active)} className="mt-1"><button className={`min-h-9 text-xs font-semibold ${item.is_active ? "text-red-700 dark:text-red-400" : "text-brand"}`} type="submit">{item.is_active ? "Desactivar" : "Activar"}</button></form>
    </li>;
  })}</ul></div>;
}
