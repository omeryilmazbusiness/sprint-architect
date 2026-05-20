import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../shared/infra/dbPing", () => ({
  pingDatabase: vi.fn(),
}));

import { pingDatabase } from "../shared/infra/dbPing";
import { runHealthCheck } from "../modules/health/usecases/RunHealthCheck";

const mockPing = vi.mocked(pingDatabase);

describe("runHealthCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STORAGE_PROVIDER;
  });

  it("returns ok when database is reachable", async () => {
    mockPing.mockResolvedValue({ ok: true, latencyMs: 2 });
    const result = await runHealthCheck();
    expect(result.status).toBe("ok");
    expect(result.checks.database.ok).toBe(true);
    expect(result.checks.storage.provider).toBe("local");
  });

  it("returns down when database fails", async () => {
    mockPing.mockResolvedValue({ ok: false, latencyMs: 50 });
    const result = await runHealthCheck();
    expect(result.status).toBe("down");
    expect(result.checks.database.ok).toBe(false);
  });
});
