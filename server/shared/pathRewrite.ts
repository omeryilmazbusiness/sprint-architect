import type { Request, Response, NextFunction } from "express";

/**
 * Rewrites req.url path prefix before the request hits a mounted router.
 * Example: /organizations -> /clinics for neutral API aliases.
 */
export function createPathRewriteMiddleware(
  pairs: Array<[from: string, to: string]>,
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const pathOnly = req.url.split("?")[0] ?? req.url;
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

    for (const [from, to] of pairs) {
      if (pathOnly === from || pathOnly.startsWith(`${from}/`)) {
        const rewritten = to + pathOnly.slice(from.length) + query;
        req.url = rewritten;
        break;
      }
    }
    next();
  };
}
