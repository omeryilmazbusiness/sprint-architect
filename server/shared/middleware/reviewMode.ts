import type { Request, Response, NextFunction } from "express";

export const REVIEW_MODE_HEADER = "x-healory-review-mode";

declare global {
  namespace Express {
    interface Request {
      reviewMode?: boolean;
    }
  }
}

/** Production uses community framing on all API-facing copy. */
export function isReviewRequest(_req: Request): boolean {
  return true;
}

export function reviewModeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.reviewMode = isReviewRequest(req);
  next();
}

/** App sends this header on store/review builds (see lib/query-client.ts). */
export function isReviewClientRequest(req: Request): boolean {
  const raw = req.headers[REVIEW_MODE_HEADER] ?? req.headers["x-healory-review-mode"];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return String(v ?? "").toLowerCase() === "1" || String(v ?? "").toLowerCase() === "true";
}
