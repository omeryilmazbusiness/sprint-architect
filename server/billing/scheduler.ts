import { runBillingCycle } from "./billingService";

const INTERVAL_MS = 60 * 60 * 1000;

export function startBillingScheduler(): void {
  console.log("[billing] Scheduler started — runs every hour");

  runBillingCycle().catch((err) => console.error("[billing] Initial cycle error:", err));

  setInterval(() => {
    runBillingCycle().catch((err) => console.error("[billing] Scheduled cycle error:", err));
  }, INTERVAL_MS);
}
