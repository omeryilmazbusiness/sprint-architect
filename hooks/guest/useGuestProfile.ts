import { useGuestDashboard } from "./useGuestDashboard";

export function useGuestProfile() {
  const { isLoading, isError, refetch, patient, hotel, doctors, transport } =
    useGuestDashboard();

  const primaryDoctor = doctors?.[0] ?? null;

  const plan = {
    doctor: primaryDoctor
      ? { name: primaryDoctor.fullName, specialty: primaryDoctor.specialty ?? null }
      : null,
    hotel: hotel ? { name: hotel.name, address: hotel.address } : null,
    transport: transport
      ? { driverName: transport.driverName, vehicleInfo: transport.vehicleInfo }
      : null,
  };

  return {
    isLoading,
    isError,
    refetch,
    patient,
    plan,
    assignedDoctors: doctors,
  };
}
