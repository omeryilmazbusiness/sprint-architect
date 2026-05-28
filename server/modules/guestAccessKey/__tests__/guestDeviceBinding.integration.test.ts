import { describe, it, expect } from "vitest";
import { env } from "../../../config";

/** Production must never allow guest multi-device bypass. */
describe("guest device binding policy", () => {
  it("disables multi-device demo bypass in production", () => {
    if (process.env.NODE_ENV === "production") {
      expect(env.guestMultiDeviceDemo).toBe(false);
    } else {
      expect(typeof env.guestMultiDeviceDemo).toBe("boolean");
    }
  });
});
