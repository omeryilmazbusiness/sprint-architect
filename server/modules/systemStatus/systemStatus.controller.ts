import type { Request, Response, NextFunction } from "express";
import { executeGetSystemStatus } from "./usecases/GetSystemStatus";
import { getSecurityMetrics } from "./repos/SecurityMetricsRepo.drizzle";

export async function handleGetSystemStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const start = Date.now();
    const result = await executeGetSystemStatus();
    result.api.latencyMs = Date.now() - start;
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetSecurityMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const adminUserId = req.actor!.sub;
    const result = await getSecurityMetrics(adminUserId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
