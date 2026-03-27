import { useQuery } from "@tanstack/react-query";

const QUERY_KEY = ["/v1/patient/notifications/unread-count"] as const;

export function useGuestNotifications() {
  const { data } = useQuery<{ unread: number }>({
    queryKey: QUERY_KEY,
    staleTime: 60_000,
    retry: 1,
  });
  return { unread: data?.unread ?? 0 };
}
