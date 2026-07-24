"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { logout } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  role: "owner" | "admin";
  title: string;
  userName: string;
};

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

export function AppShell({ children, role, title, userName }: AppShellProps) {
  const links = role === "admin" ? adminLinks : ownerLinks;
  const pathname = usePathname();
  const activeHref = links
    .filter(({ href }) =>
      href === "/admin"
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="hidden border-r bg-surface px-4 py-6 lg:flex lg:flex-col">
        <BrandMark className="px-2" />
        <nav aria-label="Navegación principal" className="mt-9 space-y-1">
          {links.map(({ label, href, icon: Icon }) => (
            <Link
              aria-current={href === activeHref ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-accent hover:text-brand-strong",
                href === activeHref && "bg-accent text-brand-strong",
              )}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" className="size-[1.125rem]" />
              {label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="mt-auto">
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-red-50 hover:text-red-700"
            type="submit"
          >
            <LogOut aria-hidden="true" className="size-[1.125rem]" />
            Cerrar sesión
          </button>
        </form>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandMark compact className="lg:hidden" />
            <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{userName}</p>
            <p className="text-xs text-muted">
              {role === "admin" ? "Administrador" : "Propietario"}
            </p>
          </div>
        </header>
        <main className="p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">{children}</main>
      </div>
      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-surface px-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {links.slice(0, 5).map(({ label, href, icon: Icon }) => (
          <Link
            aria-current={href === activeHref ? "page" : undefined}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 text-[0.65rem] font-medium text-muted hover:text-brand",
              href === activeHref && "bg-accent text-brand-strong",
            )}
            href={href}
            key={href}
          >
            <Icon aria-hidden="true" className="size-5" />
            <span className="max-w-16 truncate">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
