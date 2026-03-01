import { markOverdueInvoicesAsUnpaid, generatePendingInvoicesForPeriod, currentPeriod, isLastDayOfMonth } from "./billingService";

const ISTANBUL_TZ = "Europe/Istanbul";

function getIstanbulTime(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ISTANBUL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

function scheduleCron(
  label: string,
  targetHour: number,
  targetMinute: number,
  lastDayOnly: boolean,
  fn: () => Promise<void>
): void {
  let lastRanDate = "";

  setInterval(async () => {
    const { hour, minute } = getIstanbulTime();
    const dateKey = new Date().toISOString().slice(0, 10);

    if (lastDayOnly && !isLastDayOfMonth()) return;
    if (hour !== targetHour || minute !== targetMinute) return;
    if (lastRanDate === dateKey) return;

    lastRanDate = dateKey;
    console.log(`[scheduler] Running job: ${label}`);
    try {
      await fn();
      console.log(`[scheduler] Job completed: ${label}`);
    } catch (err) {
      console.error(`[scheduler] Job failed: ${label}`, err);
    }
  }, 60 * 1000);
}

export function startBillingScheduler(): void {
  console.log("[billing] Scheduler started (Europe/Istanbul timezone)");
  console.log("[billing]   Job A: 09:00 on last day of month → generate PENDING invoices");
  console.log("[billing]   Job B: 00:00 daily → mark overdue PENDING as UNPAID, suspend clinics");

  scheduleCron("Job A — Generate PENDING invoices (09:00 last day of month)", 9, 0, true, async () => {
    const period = currentPeriod();
    console.log(`[billing] Job A: generating invoices for period ${period}`);
    await generatePendingInvoicesForPeriod(period);
  });

  scheduleCron("Job B — Mark overdue PENDING as UNPAID (00:00 daily)", 0, 0, false, async () => {
    console.log("[billing] Job B: marking overdue invoices as UNPAID, suspending clinics + users");
    await markOverdueInvoicesAsUnpaid();
  });

  markOverdueInvoicesAsUnpaid().catch((err) => console.error("[billing] Startup overdue check error:", err));
}
