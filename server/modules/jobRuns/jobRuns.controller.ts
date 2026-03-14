import type { Request, Response, NextFunction } from "express";
import { executeGetJobStatus } from "./usecases/GetJobStatus";

export async function handleGetJobStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await executeGetJobStatus();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
