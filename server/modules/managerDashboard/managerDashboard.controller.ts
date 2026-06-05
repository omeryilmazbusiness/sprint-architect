import type { Request, Response, NextFunction } from "express";
import { GetManagerDashboard } from "./usecases/GetManagerDashboard";
import { managerDashboardRepo } from "./repos/ManagerDashboardRepo.drizzle";
import { frameManagerDashboardResponse } from "../../shared/frameUserFacingText";
import { isReviewRequest } from "../../shared/middleware/reviewMode";

const useCase = new GetManagerDashboard(managerDashboardRepo);

export async function getManagerDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clinicId = (req as any).clinicId as string;
    const data = await useCase.execute(clinicId);
    res.json(
      frameManagerDashboardResponse(
        data as unknown as Record<string, unknown>,
        isReviewRequest(req),
      ),
    );
  } catch (e) {
    next(e);
  }
}
