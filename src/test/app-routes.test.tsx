import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("renders the forgot password form when requested from the auth route", async () => {
    window.history.pushState({}, "", "/auth?mode=forgot-password");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        user: null,
        csrfToken: "csrf-guest",
      }),
    );

    render(<App />);

    expect(await screen.findByRole("button", { name: "Kirim Link Reset Password" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kembali ke login" })).toBeInTheDocument();
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

      if (url.includes("/api/shopping-list?groupId=group-1")) {
        return jsonResponse({
          items: [
            {
              id: "shopping-1",
              groupId: "group-1",
              createdBy: "user-1",
              createdByName: "Alice Rumah",
              purchasedBy: null,
              purchasedByName: null,
              name: "Telur",
              category: "Makanan",
              quantity: 2,
              unit: "kg",
              notes: "Untuk sarapan minggu depan",
              isPurchased: false,
              purchasedAt: null,
              createdAt: "2026-03-28T00:00:00.000Z",
              updatedAt: "2026-03-28T00:00:00.000Z",
            },
          ],
        });
      }

      if (url.includes("/api/meal-recommendations?groupId=group-1")) {
        return jsonResponse({
          recommendations: [
            {
              recipeId: "indo-nasi-goreng-telur",
              name: "Nasi Goreng Telur",
              cuisine: "indonesia",
              summary: "Nasi goreng rumahan yang cepat untuk sarapan atau makan malam.",
              tags: ["sarapan", "goreng", "simple"],
              bucket: "kurang-sedikit",
              requiredCount: 3,
              availableRequiredCount: 2,
              matchedOptionalCount: 1,
              expiringSoonCount: 0,
              nearestExpiryInDays: 14,
              urgencyReason: "Tinggal tambah Kecap Manis untuk melengkapi bahan utama.",
              availableIngredients: [
                {
                  ingredientId: "nasi",
                  label: "Beras",
                  matchedItemNames: ["Beras"],
                  isRequired: true,
                  isAvailable: true,
                  isExpiringSoon: false,
                  soonestExpiryDays: 30,
                },
                {
                  ingredientId: "telur",
                  label: "Telur Ayam",
                  matchedItemNames: ["Telur Ayam"],
                  isRequired: true,
                  isAvailable: true,
                  isExpiringSoon: false,
                  soonestExpiryDays: 14,
                },
              ],
              missingIngredients: [
                {
                  ingredientId: "kecap_manis",
                  label: "Kecap Manis",
                  matchedItemNames: [],
                  isRequired: true,
                  isAvailable: false,
                  isExpiringSoon: false,
                  soonestExpiryDays: null,
                },
              ],
              optionalMatches: [
                {
                  ingredientId: "daun_bawang",
                  label: "Daun Bawang",
                  matchedItemNames: ["Daun Bawang"],
                  isRequired: false,
                  isAvailable: true,
                  isExpiringSoon: false,
                  soonestExpiryDays: 7,
                },
              ],
            },
          ],
          generatedAt: "2026-03-28T00:00:00.000Z",
          totalCatalogRecipes: 200,
        });
      }

      return jsonResponse({ error: { code: "NOT_FOUND", message: `Unhandled request: ${url}` } }, 404);
    });

    render(<App />);

    expect(await screen.findByText("Halo, Alice!")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("Susu UHT").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Rekomendasi Masakan")).toBeInTheDocument();
    expect(screen.getByText("Nasi Goreng Telur")).toBeInTheDocument();
    expect(screen.getByText("Daftar Belanja Restock")).toBeInTheDocument();
    expect(screen.getByText("Telur")).toBeInTheDocument();
  });

  it("renders the full meal recommendations page for an authenticated user", async () => {
    window.history.pushState({}, "", "/meal-recommendations");

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
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
              id: "group-2",
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

      if (url.endsWith("/api/groups/group-2/members")) {
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

      if (url.includes("/api/meal-recommendations?groupId=group-2")) {
        return jsonResponse({
          recommendations: [
            {
              recipeId: "indo-nasi-goreng-telur",
              name: "Nasi Goreng Telur",
              cuisine: "indonesia",
              summary: "Nasi goreng rumahan yang cepat untuk sarapan atau makan malam.",
              tags: ["sarapan", "goreng", "simple"],
              bucket: "prioritas-hari-ini",
              requiredCount: 3,
              availableRequiredCount: 3,
              matchedOptionalCount: 1,
              expiringSoonCount: 1,
              nearestExpiryInDays: 1,
              urgencyReason: "Pakai Telur Ayam yang expired 1 hari lagi.",
              availableIngredients: [],
              missingIngredients: [],
              optionalMatches: [],
            },
            {
              recipeId: "intl-breakfast-classic-omelette",
              name: "Classic Omelette",
              cuisine: "internasional",
              summary: "Classic Omelette adalah menu sarapan cepat dengan bahan dasar yang umum di dapur rumah.",
              tags: ["sarapan", "simple"],
              bucket: "bisa-dimasak",
              requiredCount: 1,
              availableRequiredCount: 1,
              matchedOptionalCount: 0,
              expiringSoonCount: 0,
              nearestExpiryInDays: 10,
              urgencyReason: "Semua bahan utama sudah tersedia dan siap dimasak.",
              availableIngredients: [],
              missingIngredients: [],
              optionalMatches: [],
            },
          ],
          generatedAt: "2026-03-28T00:00:00.000Z",
          totalCatalogRecipes: 200,
        });
      }

      if (url.includes("/api/shopping-list?groupId=group-2")) {
        return jsonResponse({ items: [] });
      }

      if (url.includes("/api/meal-recommendations/") && init && typeof init !== "function") {
        return jsonResponse({
          recipeId: "indo-nasi-goreng-telur",
          recipeName: "Nasi Goreng Telur",
          addedItems: [],
          skippedItems: [],
        });
      }

      if (url.includes("/api/inventory?groupId=group-2")) {
        return jsonResponse({ items: [] });
      }

      return jsonResponse({ error: { code: "NOT_FOUND", message: `Unhandled request: ${url}` } }, 404);
    });

    render(<App />);

    expect(await screen.findByText("Rekomendasi Masakan")).toBeInTheDocument();
    expect(screen.getByText("Prioritas Hari Ini")).toBeInTheDocument();
    expect(screen.getByText("Bisa Dimasak Sekarang")).toBeInTheDocument();
    expect(screen.getByText("Kurang Sedikit Bahan")).toBeInTheDocument();
  });

  it("keeps inventory categories collapsed by default", async () => {
    window.history.pushState({}, "", "/inventory");

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
              id: "group-2",
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

      if (/\/api\/groups\/[^/]+\/members$/.test(url)) {
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

      if (url.includes("/api/inventory?groupId=")) {
        return jsonResponse({
          items: [
            {
              id: "item-1",
              groupId: "group-2",
              addedBy: "user-1",
              addedByName: "Alice Rumah",
              name: "Susu UHT",
              category: "Minuman",
              quantity: 2,
              unit: "kotak",
              expirationDate: "2099-04-05",
              notes: null,
              createdAt: "2026-03-28T00:00:00.000Z",
              updatedAt: "2026-03-28T00:00:00.000Z",
            },
          ],
        });
      }

      if (url.includes("/api/shopping-list?groupId=")) {
        return jsonResponse({ items: [] });
      }

      if (url.includes("/api/meal-recommendations?groupId=")) {
        return jsonResponse({
          recommendations: [],
          generatedAt: "2026-03-28T00:00:00.000Z",
          totalCatalogRecipes: 200,
        });
      }

      return jsonResponse({ error: { code: "NOT_FOUND", message: `Unhandled request: ${url}` } }, 404);
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Inventory" })).toBeInTheDocument();
    expect(screen.queryByText("Susu UHT")).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /Minuman/i }));

    expect(await screen.findByText("Susu UHT")).toBeInTheDocument();
  });
});
