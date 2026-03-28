import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

export function useShoppingList(groupId?: string) {
  return useQuery({
    queryKey: queryKeys.shoppingList(groupId ?? "none"),
    enabled: Boolean(groupId),
    retry: false,
    queryFn: async () => {
      const response = await api.getShoppingList(groupId!);
      return response.items;
    },
  });
}
