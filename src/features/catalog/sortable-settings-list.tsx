"use client";
import { GripVertical, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteCategory, deletePaymentMethod, reorderSettings, toggleCategory, togglePaymentMethod, updateCategory, updatePaymentMethod } from "@/features/catalog/actions";

type Item = { id: string; name: string; is_active: boolean; display_order: number };

export function SortableSettingsList({ items, kind }: { items: Item[]; kind: "categories" | "payment_methods" }) {
  const [ordered, setOrdered] = useState(items);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState("");
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
  const confirmDelete = () => {
    if (!deleteTarget) return;
    const remove = kind === "categories" ? deleteCategory : deletePaymentMethod;
    setDeleteError("");
    startTransition(async () => {
      const result = await remove(deleteTarget.id);
      if (result.error) { setDeleteError(result.error); return; }
      setOrdered((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    });
  };
  return <div className="mt-5"><p aria-live="polite" className="mb-2 text-xs text-muted">{pending ? "Guardando cambios..." : "Arrastra los elementos para cambiar el orden."}</p><ul className="divide-y">{ordered.map((item) => {
    const update = kind === "categories" ? updateCategory : updatePaymentMethod;
    const toggle = kind === "categories" ? toggleCategory : togglePaymentMethod;
    return <li className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 py-3 transition ${draggedId === item.id ? "opacity-40" : ""}`} draggable onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDragStart={() => setDraggedId(item.id)} onDrop={() => move(item.id)} key={item.id}>
      <button aria-label={`Arrastrar ${item.name}`} className="row-span-2 cursor-grab touch-none self-center rounded-lg p-2 text-muted active:cursor-grabbing" type="button"><GripVertical className="size-5" /></button>
      <form action={update.bind(null, item.id)} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><input className="h-10 w-full min-w-0 rounded-lg border bg-surface px-2 text-sm" defaultValue={item.name} name="name" required /><input name="display_order" type="hidden" value={item.display_order} /><button className="min-h-9 justify-self-start text-sm font-semibold text-brand sm:px-2" type="submit">Guardar</button></form>
      <div className="mt-1">{item.is_active ? <button className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400" onClick={() => { setDeleteError(""); setDeleteTarget(item); }} type="button"><Trash2 className="size-3.5" /> Borrar</button> : <form action={toggle.bind(null, item.id, true)}><button className="min-h-9 text-xs font-semibold text-brand" type="submit">Activar</button></form>}</div>
    </li>;
  })}</ul>{deleteTarget && <div aria-labelledby="delete-setting-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="dialog"><div className="w-full max-w-md rounded-3xl border bg-surface p-6 shadow-2xl"><div className="grid size-11 place-items-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"><Trash2 className="size-5" /></div><h3 className="mt-4 text-lg font-bold" id="delete-setting-title">¿Borrar “{deleteTarget.name}”?</h3><p className="mt-2 text-sm leading-6 text-muted">Esta acción eliminará {kind === "categories" ? "la categoría" : "el método de pago"}. No podrá deshacerse.</p>{deleteError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{deleteError}</p>}<div className="mt-6 grid grid-cols-2 gap-3"><button className="min-h-11 rounded-xl border bg-surface text-sm font-semibold" disabled={pending} onClick={() => setDeleteTarget(null)} type="button">Cancelar</button><button className="min-h-11 rounded-xl bg-red-700 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60" disabled={pending} onClick={confirmDelete} type="button">{pending ? "Borrando…" : "Sí, borrar"}</button></div></div></div>}</div>;
}
