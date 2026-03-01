import {
  markOverdueInvoicesAsUnpaid,
  generatePendingInvoicesForPeriod,
  currentPeriod,
  isLastDayOfMonth,
  isFirstDayOfMonth,
  sendMonthlyReport,
} from "./billingService";

const ISTANBUL_TZ = "Europe/Istanbul";

function getIstanbulDateTime(): { hour: number; minute: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ISTANBUL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
  const day = parseInt(parts.find((p) => p.type === "day")?.value ?? "1");
  return { hour, minute, day };
}

function scheduleCron(
  label: string,
  targetHour: number,
  targetMinute: number,
  condition: () => boolean,
  fn: () => Promise<void>
): void {
  let lastRanDate = "";

  setInterval(async () => {
    const { hour, minute } = getIstanbulDateTime();
    const dateKey = new Date().toISOString().slice(0, 10);

    if (!condition()) return;
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
  console.log("[billing]   Job A: 09:00 on last day of month → generate PENDING invoices + email clinics");
  console.log("[billing]   Job B: 00:00 daily → mark overdue PENDING as UNPAID, suspend clinics");
  console.log("[billing]   Job C: 00:00 on day 1 of month → send monthly status report");

  // Job A — Generate invoices on last day of month at 09:00
  scheduleCron(
    "Job A — Generate PENDING invoices (09:00 last day of month)",
    9, 0,
    () => isLastDayOfMonth(),
    async () => {
      const period = currentPeriod();
      console.log(`[billing] Job A: generating invoices for period ${period}`);
      await generatePendingInvoicesForPeriod(period);
    }
  );

  // Job B — Mark overdue as UNPAID at 00:00 daily
  scheduleCron(
    "Job B — Mark overdue PENDING as UNPAID (00:00 daily)",
    0, 0,
    () => true,
    async () => {
      console.log("[billing] Job B: marking overdue invoices as UNPAID, suspending clinics + users");
      await markOverdueInvoicesAsUnpaid();
    }
  );

  // Job C — Monthly report on the 1st of each month at 00:00
  scheduleCron(
    "Job C — Monthly status report (00:00 on 1st of month)",
    0, 0,
    () => isFirstDayOfMonth(),
    async () => {
      console.log("[billing] Job C: sending monthly status report email");
      await sendMonthlyReport();
    }
  );

  // Run overdue check on startup
  markOverdueInvoicesAsUnpaid().catch((err) =>
    console.error("[billing] Startup overdue check error:", err)
  );
}
