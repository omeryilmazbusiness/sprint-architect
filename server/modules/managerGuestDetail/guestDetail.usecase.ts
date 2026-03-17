import { AppError } from "../../auth/errors";
import { fetchGuestDetail, type GuestDetailDTO } from "./guestDetail.repo";

export async function getGuestDetailUseCase(
  clinicId: string,
  patientId: string
): Promise<GuestDetailDTO> {
  const detail = await fetchGuestDetail(clinicId, patientId);
  if (!detail) {
    throw new AppError("NOT_FOUND", "Guest not found", 404);
  }
  return detail;
}
