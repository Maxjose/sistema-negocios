import Link from "next/link";
import {
  Boxes,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  role: "owner" | "admin";
  title: string;
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

export function AppShell({ children, role, title }: AppShellProps) {
  const links = role === "admin" ? adminLinks : ownerLinks;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="hidden border-r bg-surface px-4 py-6 lg:flex lg:flex-col">
        <BrandMark className="px-2" />
        <nav aria-label="Navegación principal" className="mt-9 space-y-1">
          {links.map(({ label, href, icon: Icon }, index) => (
            <Link
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-accent hover:text-brand-strong",
                index === 0 && "bg-accent text-brand-strong",
              )}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" className="size-[1.125rem]" />
              {label}
            </Link>
          ))}
        </nav>
        <button
          className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-red-50 hover:text-red-700"
          type="button"
        >
          <LogOut aria-hidden="true" className="size-[1.125rem]" />
          Cerrar sesión
        </button>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir menú"
              className="grid size-10 place-items-center rounded-xl border lg:hidden"
              type="button"
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>
            <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          </div>
          <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-brand-strong">
            {role === "admin" ? "Administrador" : "Mi negocio"}
          </span>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
