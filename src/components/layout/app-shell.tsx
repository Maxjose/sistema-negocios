"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Boxes, ChartNoAxesCombined, ChevronDown, CircleDollarSign, Grid2X2, LayoutDashboard, LogOut, ReceiptText, Settings, ShoppingCart, Store, UserCircle, UserRound, Users, X } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logout } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import type { AccentTheme } from "@/features/catalog/types";

type AppShellProps = { accentTheme?: AccentTheme; children: React.ReactNode; enableCredits?: boolean; enableCustomers?: boolean; planExpiresAt?: string | null; planTier?: "free" | "basic" | "premium" | "unlimited"; role: "owner" | "admin"; title: string; userName: string };
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

function UserMenu({ planExpiresAt, planTier = "unlimited", role, userName }: { planExpiresAt?: string | null; planTier?: "free" | "basic" | "premium" | "unlimited"; role: "owner" | "admin"; userName: string }) {
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
  const planLabel = ({ free: "Free", basic: "Basic", premium: "Premium", unlimited: "Unlimited" } as const)[planTier];
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
          <div className="px-3 py-4 text-sm"><div className="flex items-center justify-between"><span className="text-muted">Plan</span><span className="rounded-full border bg-accent/60 px-3 py-1 text-xs font-semibold text-brand-strong">{planLabel}</span></div>{role === "owner" && <p className="mt-2 text-right text-xs text-muted">{planExpiresAt ? `Vence ${new Intl.DateTimeFormat("es-VE", { dateStyle: "medium" }).format(new Date(planExpiresAt))}` : "Sin vencimiento"}</p>}</div>
          <Link className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-foreground transition hover:bg-accent" href={role === "admin" ? "/admin/settings" : "/settings"} onClick={() => setOpen(false)} role="menuitem">
            <Settings className="size-4 text-muted" /> Configuración
          </Link>
          <form action={logout}><button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" role="menuitem" type="submit"><LogOut className="size-4" /> Cerrar sesión</button></form>
        </div>
      )}
    </div>
  );
}

export function AppShell({ accentTheme = "blue", children, enableCredits = false, enableCustomers = false, planExpiresAt, planTier, role, title, userName }: AppShellProps) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const links = role === "admin" ? adminLinks : [
    ...ownerLinks.slice(0, 4),
    ...(enableCustomers ? [{ label: "Clientes", href: "/customers", icon: UserRound }] : []),
    ...(enableCredits ? [{ label: "Por cobrar", href: "/receivables", icon: CircleDollarSign }] : []),
    ...ownerLinks.slice(4),
  ];
  const pathname = usePathname();
  const activeHref = links.filter(({ href }) => href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const mobilePrimaryLinks = role === "owner" ? links.slice(0, 4) : links;
  const mobileMoreLinks = role === "owner" ? links.slice(4) : [];
  const mobileMoreActive = mobileMoreLinks.some(({ href }) => href === activeHref);
  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground lg:grid lg:grid-cols-[17rem_1fr]" data-accent={accentTheme} data-app-shell>
      <aside className="hidden h-dvh overflow-y-auto overscroll-contain border-r bg-surface px-4 py-6 lg:flex lg:flex-col">
        <BrandMark className="px-2" />
        <nav aria-label="Navegación principal" className="mt-9 space-y-1">
          {links.map(({ label, href, icon: Icon }) => <Link aria-current={href === activeHref ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-accent hover:text-brand-strong", href === activeHref && "bg-accent text-brand-strong")} href={href} key={href}><Icon aria-hidden="true" className="size-[1.125rem]" />{label}<LinkPendingIndicator /></Link>)}
        </nav>
      </aside>
      <div className="flex h-dvh min-w-0 flex-col overflow-hidden">
        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><BrandMark compact className="lg:hidden" /><h1 className="text-lg font-bold tracking-tight">{title}</h1></div>
          <div className="flex items-center gap-2"><ThemeToggle /><UserMenu planExpiresAt={planExpiresAt} planTier={planTier} role={role} userName={userName} /></div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">{children}</main>
      </div>
      {mobileMoreOpen && role === "owner" && <div className="fixed inset-0 z-20 bg-black/45 lg:hidden" onClick={() => setMobileMoreOpen(false)} role="presentation" />}
      {mobileMoreOpen && role === "owner" && <section aria-label="Más opciones" className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 rounded-3xl border bg-surface p-3 shadow-2xl lg:hidden">
        <div className="flex items-center justify-between px-2 pb-2"><h2 className="font-bold">Más opciones</h2><button aria-label="Cerrar más opciones" className="grid size-9 place-items-center rounded-xl text-muted hover:bg-accent" onClick={() => setMobileMoreOpen(false)} type="button"><X className="size-5" /></button></div>
        <div className="grid grid-cols-2 gap-2">{mobileMoreLinks.map(({ label, href, icon: Icon }) => <Link aria-current={href === activeHref ? "page" : undefined} className={cn("flex min-h-14 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-muted transition hover:bg-accent hover:text-brand-strong", href === activeHref && "bg-accent text-brand-strong")} href={href} key={href} onClick={() => setMobileMoreOpen(false)}><Icon className="size-5" />{label}<LinkPendingIndicator /></Link>)}</div>
      </section>}
      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-surface px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {mobilePrimaryLinks.map(({ label, href, icon: Icon }) => <Link aria-current={href === activeHref ? "page" : undefined} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[0.65rem] font-medium text-muted hover:text-brand", href === activeHref && "bg-accent text-brand-strong")} href={href} key={href} onClick={() => setMobileMoreOpen(false)}><Icon aria-hidden="true" className="size-5" />{label === "Registrar venta" ? <><span className="max-w-16 truncate sm:hidden">Registrar</span><span className="hidden max-w-20 truncate sm:inline">Registrar venta</span></> : <span className="max-w-16 truncate">{label}</span>}<LinkPendingIndicator /></Link>)}
        {role === "owner" && <Link aria-expanded={mobileMoreOpen} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[0.65rem] font-medium text-muted hover:text-brand", (mobileMoreActive || mobileMoreOpen) && "bg-accent text-brand-strong")} href={pathname} onClick={(event) => { event.preventDefault(); setMobileMoreOpen((open) => !open); }}><Grid2X2 aria-hidden="true" className="size-5" /><span className="max-w-16 truncate">Más</span><LinkPendingIndicator /></Link>}
      </nav>
    </div>
  );
}
