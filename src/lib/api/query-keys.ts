export const queryKeys = {
  session: ["session"] as const,
  groups: ["groups"] as const,
  groupMembers: (groupId: string) => ["groups", groupId, "members"] as const,
  inventory: (groupId: string) => ["inventory", groupId] as const,
  shoppingList: (groupId: string) => ["shopping-list", groupId] as const,
  mealRecommendations: (groupId: string) => ["meal-recommendations", groupId] as const,
};
