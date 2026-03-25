/**
 * Central error code catalog.
 * Every code must be unique and used consistently across the codebase.
 */
export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: "AUTH-001",
  AUTH_UNAUTHORIZED:        "AUTH-002",
  AUTH_FORBIDDEN:           "AUTH-003",
  AUTH_TOKEN_INVALID:       "AUTH-004",
  AUTH_DEVICE_BOUND:        "AUTH-005",  // legacy — prefer AUTH_DEVICE_BOUND_GUEST for patient flows
  AUTH_PATIENT_KEY_INVALID: "AUTH-006",  // legacy — prefer AUTH_GUEST_KEY_INVALID

  // Guest / Patient auth codes (granular)
  AUTH_GUEST_KEY_INVALID:   "AUTH-GUEST-001",
  AUTH_DEVICE_BOUND_GUEST:  "AUTH-GUEST-002",

  BILL_CLINIC_SUSPENDED:    "BILL-001",

  VAL_VALIDATION:           "VAL-001",

  NOT_FOUND:                "NOT-001",

  DB_CONSTRAINT:            "DB-001",
  DB_GENERIC:               "DB-002",

  SYS_UNEXPECTED:           "SYS-001",

  EXT_EMAIL_FAILED:         "EXT-EMAIL-001",
  EXT_STORAGE_FAILED:       "EXT-STORAGE-001",

  PURGE_BLOCKED_SELF:              "PURGE-001",
  PURGE_PRIMARY_MANAGER_BLOCKED:   "PURGE-002",
  PURGE_BLOCKED_REFERENCES:        "PURGE-003",
  PURGE_CONFIRM_MISMATCH:          "PURGE-004",
  PURGE_FORBIDDEN_NOT_SUPER_ADMIN: "PURGE-005",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
