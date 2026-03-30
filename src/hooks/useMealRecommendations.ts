import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

export function useMealRecommendations(groupId?: string) {
  return useQuery({
    queryKey: queryKeys.mealRecommendations(groupId ?? "none"),
    enabled: Boolean(groupId),
    retry: false,
    queryFn: () => api.getMealRecommendations(groupId!),
  });
}
