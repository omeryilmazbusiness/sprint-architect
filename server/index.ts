import express from "express";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { seedDatabase } from "./seed";
import { startBillingScheduler } from "./billing/scheduler";
import { startGuestRetentionScheduler } from "./modules/guestRetention/scheduler";
import { requestIdMiddleware } from "./shared/middleware/requestId";
import { globalErrorHandler } from "./shared/middleware/errorHandler";
import { logger } from "./shared/logger";
import { GUEST_ACCESS_KEY_FORMAT_VERSION } from "./modules/guestAccessKey";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

// Behind reverse proxy (nginx, load balancer): trust X-Forwarded-For for rate limits.
app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    const extra = process.env.CORS_ALLOWED_ORIGINS?.split(",") ?? [];
    for (const entry of extra) {
      const trimmed = entry.trim();
      if (trimmed) origins.add(trimmed);
    }

    const apiPublic = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (apiPublic) {
      try {
        origins.add(new URL(apiPublic).origin);
      } catch {
        /* ignore invalid URL */
      }
    }

    const origin = req.header("origin");
    const isLocalDev =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:") ||
      origin?.startsWith("exp://");

    if (origin && (origins.has(origin) || isLocalDev)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
  app.use(express.urlencoded({ extended: false }));
}

/**
 * Keys whose values must never appear in server logs.
 * Applies to top-level response JSON fields only.
 */
const SENSITIVE_LOG_KEYS = new Set([
  "accessToken",
  "refreshToken",
  "password",
  "oneTimePassword",
  "oneTimeAccessKey",
  "hash",
  "token",
  "secret",
]);

/**
 * Returns a shallow copy of `obj` with all sensitive fields replaced by
 * "[REDACTED]".  Only top-level keys are scrubbed — deep nesting is not
 * expected in these responses and the truncation below adds a second safety
 * net anyway.
 */
function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = SENSITIVE_LOG_KEYS.has(k) ? "[REDACTED]" : v;
  }
  return out;
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const p = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!p.startsWith("/api") && !p.startsWith("/v1")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${p} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(sanitizeForLog(capturedJsonResponse))}`;
      }
      if (logLine.length > 120) logLine = logLine.slice(0, 119) + "…";
      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(process.cwd(), "static-build", platform, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  res.send(fs.readFileSync(manifestPath, "utf-8"));
}

function serveLandingPage({ req, res, landingPageTemplate, appName }: { req: Request; res: Response; landingPageTemplate: string; appName: string }) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(process.cwd(), "server", "templates", "landing-page.html");
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/v1")) return next();
    if (req.path !== "/" && req.path !== "/manifest") return next();

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage({ req, res, landingPageTemplate, appName });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use(globalErrorHandler);
}

(async () => {
  if (process.env.NODE_ENV !== "production") {
    await seedDatabase().catch((err: unknown) =>
      logger.error("[seed] DB seed failed", {
        error: err instanceof Error ? err.message.slice(0, 300) : "unknown",
      })
    );
  }

  setupCors(app);

  // Helmet — security headers.  Placed after CORS so CORS headers win.
  //
  // CSP NOTES:
  // ──────────
  // Expo web (Metro bundler) outputs inline scripts and inline styles, so
  // script-src and style-src cannot drop 'unsafe-inline'.  In development,
  // Metro also uses eval() for source maps, requiring 'unsafe-eval'.
  //
  // Despite the weakened script-src, the CSP still provides meaningful value:
  //   • object-src 'none'     → blocks Flash / plugin code-execution
  //   • base-uri 'self'       → prevents <base> tag hijacking
  //   • form-action 'self'    → prevents form submissions to external origins
  //   • frame-ancestors 'none'→ clickjacking protection (belt-and-suspenders)
  //   • upgrade-insecure-requests → enforces HTTPS in production
  //
  // To harden further in future: adopt a nonce-based CSP by injecting a
  // per-request nonce via the Expo/Metro build pipeline.
  const isProduction = process.env.NODE_ENV === "production";
  const cspScriptSrc = ["'self'", "'unsafe-inline'"];
  if (!isProduction) cspScriptSrc.push("'unsafe-eval'"); // Metro HMR in dev

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc:       ["'self'"],
          scriptSrc:        cspScriptSrc,
          scriptSrcAttr:    ["'none'"],
          styleSrc:         ["'self'", "'unsafe-inline'"],
          imgSrc:           ["'self'", "data:", "blob:", "https:"],
          fontSrc:          ["'self'", "data:"],
          mediaSrc:         ["'self'", "blob:"],
          objectSrc:        ["'none'"],
          baseUri:          ["'self'"],
          formAction:       ["'self'"],
          frameAncestors:   ["'none'"],
          workerSrc:        ["'self'", "blob:"],
          connectSrc: [
            "'self'",
            "https://exp.host",
            "https://api.expo.dev",
            "wss:",
            "ws:",
          ],
          ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
        },
      },
    }),
  );
  app.use(requestIdMiddleware);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  startBillingScheduler();
  startGuestRetentionScheduler();

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`express server serving on port ${port}`);
    log(`guest access key format v${GUEST_ACCESS_KEY_FORMAT_VERSION} (XXXX-YYYY-####)`);
  });
})();
