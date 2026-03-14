/**
 * Safety guard tests for resetLaunchDb.ts
 *
 * Verifies the script refuses to run under unsafe conditions.
 * These tests spawn the script as a child process and check exit codes / stderr.
 */

import { describe, it, expect } from "vitest";
import { spawn } from "child_process";
import path from "path";

const SCRIPT_PATH = path.resolve(__dirname, "../scripts/resetLaunchDb.ts");

function runScript(env: Record<string, string>): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn("npx", ["tsx", SCRIPT_PATH], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stderr, stdout });
    });
  });
}

describe("resetLaunchDb.ts — Safety Guards", () => {
  // ─── G1: Refuse when NODE_ENV=test ─────────────────────────────────────────
  it("G1: exits non-zero when NODE_ENV=test", async () => {
    const result = await runScript({
      NODE_ENV: "test",
      RESET_CONFIRM: "YES_DELETE_ALL",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/REFUSED/i);
    expect(result.stderr).toMatch(/test/i);
  }, 20_000);

  // ─── G2: Refuse when dbname contains "test" ────────────────────────────────
  it("G2: exits non-zero when DATABASE_URL dbname contains 'test'", async () => {
    const result = await runScript({
      NODE_ENV: "development",
      DATABASE_URL: "postgres://user:pass@localhost:5432/heliumdb_test",
      RESET_CONFIRM: "YES_DELETE_ALL",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/REFUSED/i);
    expect(result.stderr).toMatch(/test/i);
  }, 20_000);

  // ─── G3: DRY-RUN exits 0 when RESET_CONFIRM is a non-matching value ─────────
  it("G3: exits 0 in DRY-RUN mode when RESET_CONFIRM does not match", async () => {
    const result = await runScript({
      NODE_ENV: "development",
      RESET_CONFIRM: "no-thanks",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/DRY-RUN/i);
  }, 30_000);

  // ─── G4: DRY-RUN exits 0 when RESET_CONFIRM is wrong value ────────────────
  it("G4: exits 0 in DRY-RUN mode when RESET_CONFIRM is wrong string", async () => {
    const result = await runScript({
      NODE_ENV: "development",
      RESET_CONFIRM: "yes-delete-all",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/DRY-RUN/i);
  }, 30_000);
});
