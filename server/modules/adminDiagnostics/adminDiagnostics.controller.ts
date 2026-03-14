import type { Request, Response, NextFunction } from "express";
import { getDiagnostics } from "./usecases/GetDiagnostics";

export async function handleGetDiagnostics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = await getDiagnostics();
    res.json(dto);
  } catch (err) {
    next(err);
  }
}
