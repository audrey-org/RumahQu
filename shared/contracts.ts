export type GroupRole = "owner" | "member";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  createdAt: string;
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
  expirationDate: string;
  notes?: string;
}

export interface UpdateInventoryItemInput {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  expirationDate?: string;
  notes?: string | null;
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
