"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Boxes, ChartNoAxesCombined, ChevronDown, LayoutDashboard, LogOut, ReceiptText, Settings, ShoppingCart, Store, UserCircle, Users } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logout } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

type AppShellProps = { children: React.ReactNode; role: "owner" | "admin"; title: string; userName: string };
const ownerLinks = [
  { label: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { label: "Registrar venta", href: "/sales/new", icon: ShoppingCart },
  { label: "Ventas", href: "/sales", icon: ReceiptText },
  { label: "Productos", href: "/products", icon: Boxes },
  { label: "Reportes", href: "/reports", icon: ChartNoAxesCombined },
  { label: "Configuración", href: "/settings", icon: Settings },
];
const adminLinks = [
  { label: "Resumen", href: "/admin", icon: LayoutDashboard },
  { label: "Negocios", href: "/admin/businesses", icon: Store },
  { label: "Usuarios", href: "/admin/users", icon: Users },
  { label: "Actividad", href: "/admin/activity", icon: ReceiptText },
  { label: "Configuración", href: "/admin/settings", icon: Settings },
];

function LinkPendingIndicator() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={cn("ml-auto size-2 rounded-full bg-current opacity-0", pending && "animate-pulse opacity-50")} />;
}

function UserMenu({ role, userName }: { role: "owner" | "admin"; userName: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);
  const roleLabel = role === "admin" ? "Administrador" : "Propietario";
  return (
    <div className="relative" ref={containerRef}>
      <button aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-accent" onClick={() => setOpen((current) => !current)} type="button">
        <div className="hidden text-right sm:block"><p className="max-w-40 truncate text-sm font-semibold">{userName}</p><p className="text-xs text-muted">{roleLabel}</p></div>
        <UserCircle className="size-9 text-muted" />
        <ChevronDown className={`size-4 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-72 rounded-2xl border bg-surface p-3 shadow-xl" role="menu">
          <div className="flex items-center gap-3 rounded-xl bg-background p-3">
            <UserCircle className="size-10 shrink-0 text-muted" />
            <div className="min-w-0"><p className="truncate text-sm font-bold">{userName}</p><p className="text-xs text-muted">{roleLabel}</p></div>
          </div>
          <div className="flex items-center justify-between px-3 py-4 text-sm"><span className="text-muted">Plan</span><span className="rounded-full border bg-accent/60 px-3 py-1 text-xs font-semibold text-brand-strong">Básico</span></div>
          <form action={logout}><button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" role="menuitem" type="submit"><LogOut className="size-4" /> Cerrar sesión</button></form>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children, role, title, userName }: AppShellProps) {
  const links = role === "admin" ? adminLinks : ownerLinks;
  const pathname = usePathname();
  const activeHref = links.filter(({ href }) => href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="hidden border-r bg-surface px-4 py-6 lg:flex lg:flex-col">
        <BrandMark className="px-2" />
        <nav aria-label="Navegación principal" className="mt-9 space-y-1">
          {links.map(({ label, href, icon: Icon }) => <Link aria-current={href === activeHref ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-accent hover:text-brand-strong", href === activeHref && "bg-accent text-brand-strong")} href={href} key={href}><Icon aria-hidden="true" className="size-[1.125rem]" />{label}<LinkPendingIndicator /></Link>)}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><BrandMark compact className="lg:hidden" /><h1 className="text-lg font-bold tracking-tight">{title}</h1></div>
          <div className="flex items-center gap-2"><ThemeToggle /><UserMenu role={role} userName={userName} /></div>
        </header>
        <main className="p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">{children}</main>
      </div>
      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-surface px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {links.slice(0, 5).map(({ label, href, icon: Icon }) => <Link aria-current={href === activeHref ? "page" : undefined} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[0.65rem] font-medium text-muted hover:text-brand", href === activeHref && "bg-accent text-brand-strong")} href={href} key={href}><Icon aria-hidden="true" className="size-5" /><span className="max-w-16 truncate">{label}</span><LinkPendingIndicator /></Link>)}
      </nav>
    </div>
  );
}
