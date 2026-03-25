/**
 * seedDemoGuest.ts — Idempotent demo patient seed
 * ================================================
 * Creates (or verifies) a permanent demo patient so you can test guest login
 * without touching production data.
 *
 * Demo key : PT-4S9WQ2U6
 * Name     : Demo Guest
 * Status   : ACTIVE
 * Clinic   : Demo Clinic
 *
 * Usage:
 *   npm run db:seed:demo-guest
 *   — or —
 *   NODE_ENV=development tsx server/scripts/seedDemoGuest.ts
 *
 * After running, enable multi-device mode for testing:
 *   Set GUEST_MULTI_DEVICE_DEMO=true in Replit Secrets (Secrets tab)
 *   Then restart the backend workflow.
 *   To turn off: delete the secret (or set it to "false").
 */

// Delegates to the canonical seed implementation.
import "./seedDemoGuestKey";
