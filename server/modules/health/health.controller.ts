import type { Request, Response } from "express";
import { runHealthCheck } from "./usecases/RunHealthCheck";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const payload = await runHealthCheck();
  const httpStatus = payload.status === "down" ? 503 : 200;
  res.status(httpStatus).json(payload);
}
