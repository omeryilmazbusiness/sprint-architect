/**
 * Run guest retention tick once (archive emails + purges).
 * Usage: npx tsx scripts/run-retention-tick.ts [--dry-run]
 */
import { runRetentionTick } from "../server/modules/guestRetention/usecases/RunRetentionTick";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const result = await runRetentionTick.execute({ dryRun });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
