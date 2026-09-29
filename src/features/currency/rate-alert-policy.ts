export type PreviousRateState = {
  status?: string | null;
  error_message?: string | null;
};

export function rateAlertTransition(
  previous: PreviousRateState | null,
  next: { status: "current" | "error"; message?: string },
) {
  if (next.status === "error") {
    return previous?.status !== "error" || previous.error_message !== next.message
      ? "error"
      : null;
  }
  return previous?.status === "error" ? "recovery" : null;
}
