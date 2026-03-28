import type {
  ApiError,
  AuthResponse,
  CreateShoppingListItemInput,
  GroupMembersResponse,
  GroupSummary,
  GroupsResponse,
  InventoryItem,
  InventoryResponse,
  PendingInvite,
  SessionResponse,
  ShoppingListItem,
  ShoppingListResponse,
  UpdateShoppingListItemInput,
  UpdateInventoryItemInput,
  UpdateProfileInput,
} from "@/lib/contracts";

function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3001";
}

const DEFAULT_API_BASE_URL = getApiBaseUrl();

let csrfToken: string | null = null;

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: Record<string, unknown> | null;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  searchParams?: Record<string, string | number | null | undefined>;
};

function isMutation(method: string | undefined) {
  return method !== undefined && method !== "GET";
}

function updateCsrfToken(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "csrfToken" in payload &&
    typeof payload.csrfToken === "string"
  ) {
    csrfToken = payload.csrfToken;
  }
}

function buildUrl(pathname: string, searchParams?: RequestOptions["searchParams"]) {
  const url = new URL(pathname, DEFAULT_API_BASE_URL);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function request<T>(pathname: string, options: RequestOptions = {}) {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (isMutation(options.method) && csrfToken) {
    headers.set("x-csrf-token", csrfToken);
  }

  const response = await fetch(buildUrl(pathname, options.searchParams), {
    method: options.method ?? "GET",
    credentials: "include",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;
  updateCsrfToken(payload);

  if (!response.ok) {
    const errorPayload = payload as ApiError | null;
    throw new ApiClientError(
      response.status,
      errorPayload?.error.code ?? "REQUEST_FAILED",
      errorPayload?.error.message ?? "Request gagal",
      errorPayload?.error.details ?? null,
    );
  }

  return payload as T;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan yang tidak diketahui";
}

export const api = {
  getSession() {
    return request<SessionResponse>("/api/auth/me");
  },
  register(email: string, password: string, fullName: string) {
    return request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: { email, password, fullName },
    });
  },
  login(email: string, password: string) {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },
  logout() {
    return request<SessionResponse>("/api/auth/logout", {
      method: "POST",
    });
  },
  updateProfile(input: UpdateProfileInput) {
    return request<AuthResponse>("/api/me", {
      method: "PATCH",
      body: input,
    });
  },
  getGroups() {
    return request<GroupsResponse>("/api/groups");
  },
  createGroup(name: string) {
    return request<GroupSummary>("/api/groups", {
      method: "POST",
      body: { name },
    });
  },
  getGroupMembers(groupId: string) {
    return request<GroupMembersResponse>(`/api/groups/${groupId}/members`);
  },
  inviteMember(groupId: string, email: string) {
    return request<PendingInvite>(`/api/groups/${groupId}/invites`, {
      method: "POST",
      body: { email },
    });
  },
  acceptInvite(inviteId: string) {
    return request<{ groupId: string }>(`/api/invites/${inviteId}/accept`, {
      method: "POST",
    });
  },
  declineInvite(inviteId: string) {
    return request<{ success: true }>(`/api/invites/${inviteId}/decline`, {
      method: "POST",
    });
  },
  removeMember(groupId: string, userId: string) {
    return request<{ success: true }>(`/api/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    });
  },
  getInventory(groupId: string) {
    return request<InventoryResponse>("/api/inventory", {
      searchParams: { groupId },
    });
  },
  getShoppingList(groupId: string) {
    return request<ShoppingListResponse>("/api/shopping-list", {
      searchParams: { groupId },
    });
  },
  createInventoryItem(input: {
    groupId: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    expirationDate: string;
    notes?: string;
  }) {
    return request<InventoryItem>("/api/inventory", {
      method: "POST",
      body: input,
    });
  },
  createShoppingListItem(input: CreateShoppingListItemInput) {
    return request<ShoppingListItem>("/api/shopping-list", {
      method: "POST",
      body: input,
    });
  },
  updateInventoryItem(itemId: string, input: UpdateInventoryItemInput) {
    return request<InventoryItem>(`/api/inventory/${itemId}`, {
      method: "PATCH",
      body: input,
    });
  },
  updateShoppingListItem(itemId: string, input: UpdateShoppingListItemInput) {
    return request<ShoppingListItem>(`/api/shopping-list/${itemId}`, {
      method: "PATCH",
      body: input,
    });
  },
  deleteInventoryItem(itemId: string) {
    return request<void>(`/api/inventory/${itemId}`, {
      method: "DELETE",
    });
  },
  deleteShoppingListItem(itemId: string) {
    return request<void>(`/api/shopping-list/${itemId}`, {
      method: "DELETE",
    });
  },
};
