export const queryKeys = {
  session: ["session"] as const,
  adminStats: ["admin", "stats"] as const,
  adminUsers: ["admin", "users"] as const,
  groups: ["groups"] as const,
  groupMembers: (groupId: string) => ["groups", groupId, "members"] as const,
  inventory: (groupId: string) => ["inventory", groupId] as const,
  shoppingList: (groupId: string) => ["shopping-list", groupId] as const,
  mealRecommendations: (groupId: string) => ["meal-recommendations", groupId] as const,
};
