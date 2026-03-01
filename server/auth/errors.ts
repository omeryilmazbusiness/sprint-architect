export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  INVALID_CREDENTIALS: () =>
    new AppError("AUTH_INVALID_CREDENTIALS", "Invalid email or password", 401),
  UNAUTHORIZED: () =>
    new AppError("AUTH_UNAUTHORIZED", "Authentication required", 401),
  FORBIDDEN: (msg = "Access denied") =>
    new AppError("AUTH_FORBIDDEN", msg, 403),
  DEVICE_ALREADY_BOUND: () =>
    new AppError(
      "DEVICE_ALREADY_BOUND",
      "This patient account is already bound to another device. Contact your clinic to reset.",
      403,
    ),
  PATIENT_KEY_INVALID: () =>
    new AppError("PATIENT_KEY_INVALID", "Invalid patient key", 401),
  VALIDATION_ERROR: (msg: string) =>
    new AppError("VALIDATION_ERROR", msg, 422),
  TOKEN_INVALID: () =>
    new AppError("AUTH_TOKEN_INVALID", "Token is invalid or expired", 401),
  NOT_FOUND: (msg = "Not found") =>
    new AppError("NOT_FOUND", msg, 404),
  CLINIC_SUSPENDED: () =>
    new AppError("CLINIC_SUSPENDED_BILLING", "Your clinic account is suspended due to an unpaid invoice. Please contact your administrator.", 403),
  CLINIC_SUSPENDED_BILLING: () =>
    new AppError("CLINIC_SUSPENDED_BILLING", "Your clinic account is suspended due to an unpaid invoice. Please contact your administrator.", 403),
};
