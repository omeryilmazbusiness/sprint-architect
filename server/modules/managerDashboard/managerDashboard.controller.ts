import type { Request, Response, NextFunction } from "express";
import { GetManagerDashboard } from "./usecases/GetManagerDashboard";
import { managerDashboardRepo } from "./repos/ManagerDashboardRepo.drizzle";

const useCase = new GetManagerDashboard(managerDashboardRepo);

export async function getManagerDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clinicId = (req as any).clinicId as string;
    const data = await useCase.execute(clinicId);
    res.json(data);
  } catch (e) {
    next(e);
  }
}
