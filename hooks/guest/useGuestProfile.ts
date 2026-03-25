import { useGuestDashboard } from "./useGuestDashboard";

export function useGuestProfile() {
  const { isLoading, isError, refetch, patient, plan, doctors } =
    useGuestDashboard();

  return {
    isLoading,
    isError,
    refetch,
    patient,
    plan,
    assignedDoctors: doctors,
  };
}
