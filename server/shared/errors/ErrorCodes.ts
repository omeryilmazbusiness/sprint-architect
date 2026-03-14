/**
 * Central error code catalog.
 * Every code must be unique and used consistently across the codebase.
 */
export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: "AUTH-001",
  AUTH_UNAUTHORIZED:        "AUTH-002",
  AUTH_FORBIDDEN:           "AUTH-003",
  AUTH_TOKEN_INVALID:       "AUTH-004",
  AUTH_DEVICE_BOUND:        "AUTH-005",
  AUTH_PATIENT_KEY_INVALID: "AUTH-006",

  BILL_CLINIC_SUSPENDED:    "BILL-001",

  VAL_VALIDATION:           "VAL-001",

  NOT_FOUND:                "NOT-001",

  DB_CONSTRAINT:            "DB-001",
  DB_GENERIC:               "DB-002",

  SYS_UNEXPECTED:           "SYS-001",

  EXT_EMAIL_FAILED:         "EXT-EMAIL-001",
  EXT_STORAGE_FAILED:       "EXT-STORAGE-001",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
