export { AppError } from "../shared/errors/AppError";
import { AppError } from "../shared/errors/AppError";
import { ErrorCodes } from "../shared/errors/ErrorCodes";

export const Errors = {
  INVALID_CREDENTIALS: () =>
    new AppError(ErrorCodes.AUTH_INVALID_CREDENTIALS, "Invalid email or password", 401),
  UNAUTHORIZED: () =>
    new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Authentication required", 401),
  FORBIDDEN: (msg = "Access denied") =>
    new AppError(ErrorCodes.AUTH_FORBIDDEN, msg, 403),
  DEVICE_ALREADY_BOUND: () =>
    new AppError(
      ErrorCodes.AUTH_DEVICE_BOUND_GUEST,
      "This invite code is already registered to another device. Use your original device, or ask your community host to reset the binding.",
      403,
    ),
  PATIENT_KEY_INVALID: () =>
    new AppError(ErrorCodes.AUTH_GUEST_KEY_INVALID, "Invalid invite code", 401),
  VALIDATION_ERROR: (msg: string) =>
    new AppError(ErrorCodes.VAL_VALIDATION, msg, 422),
  TOKEN_INVALID: () =>
    new AppError(ErrorCodes.AUTH_TOKEN_INVALID, "Token is invalid or expired", 401),
  NOT_FOUND: (msg = "Not found") =>
    new AppError(ErrorCodes.NOT_FOUND, msg, 404),
  CLINIC_SUSPENDED: () =>
    new AppError(ErrorCodes.BILL_CLINIC_SUSPENDED, "Community access is paused. Please contact your community host.", 403),
  CLINIC_SUSPENDED_BILLING: () =>
    new AppError(ErrorCodes.BILL_CLINIC_SUSPENDED, "Community access is paused. Please contact your community host.", 403),
};
