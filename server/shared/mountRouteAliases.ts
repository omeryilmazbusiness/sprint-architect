import type { Express, Router } from "express";

/** Register the same router at a legacy path and a neutral alias path. */
export function mountRouterAlias(
  app: Express,
  legacyPrefix: string,
  aliasPrefix: string,
  router: Router,
): void {
  app.use(legacyPrefix, router);
  if (legacyPrefix !== aliasPrefix) {
    app.use(aliasPrefix, router);
  }
}
