import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("app routes", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated users to the auth screen", async () => {
    window.history.pushState({}, "", "/");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        user: null,
        csrfToken: "csrf-guest",
      }),
    );

    render(<App />);

    expect(await screen.findByText("Kelola inventaris rumah tangga bersama keluarga")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Daftar" })).toBeInTheDocument();
  });

  it("renders the dashboard for an authenticated user", async () => {
    window.history.pushState({}, "", "/");

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/api/auth/me")) {
        return jsonResponse({
          user: {
            id: "user-1",
            email: "alice@example.com",
            fullName: "Alice Rumah",
            avatarUrl: null,
            createdAt: "2026-03-28T00:00:00.000Z",
          },
          csrfToken: "csrf-authenticated",
        });
      }

      if (url.endsWith("/api/groups")) {
        return jsonResponse({
          groups: [
            {
              id: "group-1",
              name: "Rumah Alice",
              role: "owner",
              memberCount: 1,
              createdBy: "user-1",
              createdAt: "2026-03-28T00:00:00.000Z",
            },
          ],
          pendingInvites: [],
        });
      }

      if (url.endsWith("/api/groups/group-1/members")) {
        return jsonResponse({
          members: [
            {
              userId: "user-1",
              email: "alice@example.com",
              fullName: "Alice Rumah",
              role: "owner",
              joinedAt: "2026-03-28T00:00:00.000Z",
            },
          ],
        });
      }

      if (url.includes("/api/inventory?groupId=group-1")) {
        return jsonResponse({
          items: [
            {
              id: "item-1",
              groupId: "group-1",
              addedBy: "user-1",
              addedByName: "Alice Rumah",
              name: "Susu UHT",
              category: "Minuman",
              quantity: 2,
              unit: "kotak",
              expirationDate: "2026-04-05",
              notes: null,
              createdAt: "2026-03-28T00:00:00.000Z",
              updatedAt: "2026-03-28T00:00:00.000Z",
            },
          ],
        });
      }

      return jsonResponse({ error: { code: "NOT_FOUND", message: `Unhandled request: ${url}` } }, 404);
    });

    render(<App />);

    expect(await screen.findByText("Halo, Alice!")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Susu UHT")).toBeInTheDocument();
    });
  });
});
