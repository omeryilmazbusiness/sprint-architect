import type { Request } from "express";

/** Express `req.params` values may be `string | string[]`; normalize to a single string. */
export function param(req: Request, key: string): string {
  const value = req.params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
