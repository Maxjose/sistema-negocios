import { BellRing, CircleDollarSign, ShieldCheck, Wrench } from "lucide-react";
import { getPlatformSettings } from "@/features/admin/data";
import { MaintenanceForm } from "@/features/admin/maintenance-form";
import { AdminRatesForm, ManualGlobalRateForm, TelegramAlertTestForm } from "@/features/currency/admin-rates-form";
import { getGlobalExchangeRates } from "@/features/currency/data";
import { telegramAlertsConfigured } from "@/features/currency/telegram-alert";

export default async function AdminSettingsPage() {
  const [settings, rates] = await Promise.all([getPlatformSettings(), getGlobalExchangeRates()]);
  const telegramConfigured = telegramAlertsConfigured();
  return <div className="max-w-2xl">
    <p className="text-sm text-muted">Opciones de alcance global</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Configuración</h2>
    <section className="mt-7 rounded-2xl border bg-surface p-6"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-brand"><Wrench className="size-5" /></span><div><h3 className="font-bold">Mantenimiento</h3><p className="mt-2 text-sm leading-6 text-muted">Controla temporalmente el acceso general a la plataforma.</p></div></div><MaintenanceForm enabled={settings.maintenance_mode} /></section>
    <section className="mt-6 rounded-2xl border bg-surface p-6">
      <div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-brand"><CircleDollarSign className="size-5" /></span><div><h3 className="font-bold">Tasas de cambio globales</h3><p className="mt-2 text-sm leading-6 text-muted">Las tiendas pueden usar estas referencias o establecer tasas manuales.</p></div></div>
      <div className="mt-5 divide-y rounded-xl border">{rates.map((rate) => <div className="p-4" key={rate.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">USD / {rate.quote_currency}</p><p className="text-xs text-muted">{rate.source} · {rate.effective_date ?? "Sin fecha efectiva"}</p></div><div className="text-right"><p className="font-bold">{rate.rate ? Number(rate.rate).toLocaleString("es-VE", { maximumFractionDigits: 8 }) : "Sin tasa"}</p><span className={`text-xs font-semibold ${rate.status === "current" ? "text-emerald-600" : "text-amber-600"}`}>{rate.status === "current" ? "Actualizada" : rate.error_message ?? "Pendiente"}</span></div></div><ManualGlobalRateForm current={rate.rate ? Number(rate.rate) : null} quote={rate.quote_currency as "VES" | "COP"} /></div>)}</div>
      <AdminRatesForm />
    </section>
    <section className="mt-6 rounded-2xl border bg-surface p-6"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-brand"><BellRing className="size-5" /></span><div><h3 className="font-bold">Alertas de tasas</h3><p className="mt-2 text-sm leading-6 text-muted">Recibe en Telegram una notificación cuando una tasa falle o vuelva a funcionar. Los errores repetidos idénticos no generan mensajes duplicados.</p></div></div><TelegramAlertTestForm configured={telegramConfigured} /></section>
    <section className="mt-6 rounded-2xl border bg-surface p-6"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-brand"><ShieldCheck className="size-5" /></span><div><h3 className="font-bold">Administración protegida</h3><p className="mt-2 text-sm leading-6 text-muted">Solo el superadministrador puede modificar estas opciones globales.</p></div></div></section>
  </div>;
}
