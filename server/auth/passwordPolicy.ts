import { AppError } from "./errors";

const COMMON_PASSWORDS = [
  "password", "password1", "password123", "password1234", "password12345",
  "qwerty123", "qwerty1234", "letmein123", "welcome1", "welcome123",
  "123456789", "1234567890", "12345678901", "abcdefgh", "admin1234",
  "iloveyou1", "sunshine1", "monkey123", "master123", "dragon1234",
];

export interface PolicyViolation {
  code: "PASSWORD_POLICY_VIOLATION";
  message: string;
}

export function validatePasswordPolicy(password: string, userEmail?: string): void {
  const violations: string[] = [];

  if (password.length < 12) {
    violations.push("must be at least 12 characters");
  }
  if (!/[A-Z]/.test(password)) {
    violations.push("must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    violations.push("must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    violations.push("must contain at least one number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    violations.push("must contain at least one special character (!@#$%^&* etc.)");
  }

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.some((p) => lower === p || lower.startsWith(p))) {
    violations.push("is too common");
  }
  if (userEmail) {
    const emailLocal = userEmail.split("@")[0].toLowerCase();
    if (emailLocal.length > 2 && lower.includes(emailLocal)) {
      violations.push("must not contain your email address");
    }
  }

  if (violations.length > 0) {
    throw new AppError(
      "PASSWORD_POLICY_VIOLATION",
      `Password ${violations.join("; ")}`,
      422,
    );
  }
}
