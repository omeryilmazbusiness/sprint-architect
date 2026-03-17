import { Request, Response, NextFunction } from "express";
import { getGuestDetailUseCase } from "./guestDetail.usecase";

export async function getGuestDetailController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const clinicId = (req as any).clinicId as string;
    const id = req.params.id as string;
    const detail = await getGuestDetailUseCase(clinicId, id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
}
