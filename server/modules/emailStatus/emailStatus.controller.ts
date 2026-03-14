import type { Request, Response, NextFunction } from "express";
import { executeGetEmailStatus } from "./usecases/GetEmailStatus";

export async function handleGetEmailStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await executeGetEmailStatus();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
