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
    new AppError(ErrorCodes.AUTH_DEVICE_BOUND_GUEST, "This access key is already active on another device. Ask your clinic manager to reset your device binding.", 403),
  PATIENT_KEY_INVALID: () =>
    new AppError(ErrorCodes.AUTH_GUEST_KEY_INVALID, "Invalid patient key", 401),
  VALIDATION_ERROR: (msg: string) =>
    new AppError(ErrorCodes.VAL_VALIDATION, msg, 422),
  TOKEN_INVALID: () =>
    new AppError(ErrorCodes.AUTH_TOKEN_INVALID, "Token is invalid or expired", 401),
  NOT_FOUND: (msg = "Not found") =>
    new AppError(ErrorCodes.NOT_FOUND, msg, 404),
  CLINIC_SUSPENDED: () =>
    new AppError(ErrorCodes.BILL_CLINIC_SUSPENDED, "Your clinic account is suspended due to an unpaid invoice. Please contact your administrator.", 403),
  CLINIC_SUSPENDED_BILLING: () =>
    new AppError(ErrorCodes.BILL_CLINIC_SUSPENDED, "Your clinic account is suspended due to an unpaid invoice. Please contact your administrator.", 403),
};
