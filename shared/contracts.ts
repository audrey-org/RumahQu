export type GroupRole = "owner" | "member";
export type AppRole = "user" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  createdAt: string;
  role: AppRole;
}

export type Profile = SessionUser;

export interface SessionResponse {
  user: SessionUser | null;
  csrfToken: string;
}

export interface AuthResponse {
  user: SessionUser;
  csrfToken: string;
}

export interface RegisterResponse {
  email: string;
  verificationRequired: true;
  message: string;
  verificationUrl?: string;
}

export interface VerificationEmailResponse {
  message: string;
  email?: string;
  verificationUrl?: string;
}

export interface PasswordResetEmailResponse {
  message: string;
  email?: string;
  resetUrl?: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  role: GroupRole;
  memberCount: number;
  createdBy: string;
  createdAt: string;
}

export interface PendingInvite {
  id: string;
  groupId: string;
  groupName: string;
  invitedEmail: string;
  invitedByUserId: string;
  invitedByFullName: string;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  email: string;
  fullName: string;
  role: GroupRole;
  joinedAt: string;
}

export interface GroupsResponse {
  groups: GroupSummary[];
  pendingInvites: PendingInvite[];
}

export interface GroupMembersResponse {
  members: GroupMember[];
}

export interface InventoryItem {
  id: string;
  groupId: string;
  addedBy: string | null;
  addedByName: string | null;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number | null;
  restockTargetQuantity: number | null;
  expirationDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryResponse {
  items: InventoryItem[];
}

export interface CreateInventoryItemInput {
  groupId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold?: number | null;
  restockTargetQuantity?: number | null;
  expirationDate: string;
  notes?: string;
}

export interface UpdateInventoryItemInput {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  lowStockThreshold?: number | null;
  restockTargetQuantity?: number | null;
  expirationDate?: string;
  notes?: string | null;
}

export type InventoryAdjustmentType = "add" | "use" | "set";

export interface InventoryAdjustment {
  id: string;
  itemId: string;
  groupId: string;
  adjustedBy: string | null;
  adjustedByName: string | null;
  type: InventoryAdjustmentType;
  delta: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string | null;
  createdAt: string;
}

export interface AdjustInventoryStockInput {
  type: InventoryAdjustmentType;
  quantity: number;
  reason?: string;
}

export interface InventoryAdjustmentsResponse {
  adjustments: InventoryAdjustment[];
}

export type RestockSuggestionStatus = "added" | "already-in-shopping-list";

export interface RestockSuggestionResponse {
  status: RestockSuggestionStatus;
  shoppingListItem: ShoppingListItem | null;
}

export interface ShoppingListItem {
  id: string;
  groupId: string;
  createdBy: string | null;
  createdByName: string | null;
  purchasedBy: string | null;
  purchasedByName: string | null;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  notes: string | null;
  isPurchased: boolean;
  purchasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListResponse {
  items: ShoppingListItem[];
}

export type RecipeCuisine = "indonesia" | "internasional";

export type MealRecommendationBucket =
  | "prioritas-hari-ini"
  | "bisa-dimasak"
  | "kurang-sedikit";

export interface RecommendationIngredientMatch {
  ingredientId: string;
  label: string;
  matchedItemNames: string[];
  isRequired: boolean;
  isAvailable: boolean;
  isExpiringSoon: boolean;
  soonestExpiryDays: number | null;
}

export interface MealRecommendation {
  recipeId: string;
  name: string;
  cuisine: RecipeCuisine;
  summary: string;
  tags: string[];
  bucket: MealRecommendationBucket;
  requiredCount: number;
  availableRequiredCount: number;
  matchedOptionalCount: number;
  expiringSoonCount: number;
  nearestExpiryInDays: number | null;
  urgencyReason: string | null;
  availableIngredients: RecommendationIngredientMatch[];
  missingIngredients: RecommendationIngredientMatch[];
  optionalMatches: RecommendationIngredientMatch[];
}

export interface MealRecommendationsResponse {
  recommendations: MealRecommendation[];
  generatedAt: string;
  totalCatalogRecipes: number;
}

export type MissingIngredientSkipReason =
  | "already-in-shopping-list"
  | "already-available"
  | "not-missing";

export interface AddedShoppingListIngredient {
  ingredientId: string;
  shoppingListItemId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
}

export interface SkippedShoppingListIngredient {
  ingredientId: string;
  name: string;
  reason: MissingIngredientSkipReason;
}

export interface AddMissingIngredientsResponse {
  recipeId: string;
  recipeName: string;
  addedItems: AddedShoppingListIngredient[];
  skippedItems: SkippedShoppingListIngredient[];
}

export interface CreateShoppingListItemInput {
  groupId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface UpdateShoppingListItemInput {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  notes?: string | null;
  isPurchased?: boolean;
}

export interface UpdateProfileInput {
  fullName: string;
  avatarUrl?: string | null;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
  };
}

export interface AdminDailySignup {
  date: string;
  count: number;
}

export interface AdminStatsResponse {
  totalUsers: number;
  verifiedUsers: number;
  dailySignups: AdminDailySignup[];
}

export interface AdminUserSummary {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  createdAt: string;
  emailVerifiedAt: string | null;
}

export interface AdminUsersResponse {
  users: AdminUserSummary[];
}
