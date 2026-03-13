import type { Request, Response, NextFunction } from "express";
import { getAdminDashboardOverview } from "./usecases/GetAdminDashboardOverview";

export async function getDashboardOverview(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = await getAdminDashboardOverview();
    res.json(dto);
  } catch (err) {
    next(err);
  }
}
