import type { Request, Response, NextFunction } from "express";
import { GetTodayAppointments } from "./usecases/GetTodayAppointments";
import { managerAppointmentsRepo } from "./repos/ManagerAppointmentsRepo.drizzle";

const getTodayUseCase = new GetTodayAppointments(managerAppointmentsRepo);

export async function getTodayAppointments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const clinicId = (req as any).clinicId as string;
    const data = await getTodayUseCase.execute(clinicId);
    res.json(data);
  } catch (e) {
    next(e);
  }
}
