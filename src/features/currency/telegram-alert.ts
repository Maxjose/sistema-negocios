import "server-only";

type TelegramResponse = { ok?: boolean; description?: string };

export function telegramAlertsConfigured() {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() &&
      process.env.TELEGRAM_CHAT_ID?.trim(),
  );
}

export async function sendTelegramAlert(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    throw new Error("Falta configurar TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en Vercel.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as TelegramResponse | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.description ?? `Telegram respondió ${response.status}.`);
  }
}
