import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ItemCard } from "@/components/ItemCard";
import type { InventoryItem } from "@/lib/contracts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderItemCard(item: InventoryItem) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ItemCard item={item} groupId="group-1" onDeleted={() => {}} />
    </QueryClientProvider>,
  );
}

const baseItem: InventoryItem = {
  id: "inventory-1",
  groupId: "group-1",
  addedBy: "user-1",
  addedByName: "Alice",
  name: "Telur ayam",
  category: "Makanan",
  quantity: 2,
  unit: "pcs",
  lowStockThreshold: 4,
  restockTargetQuantity: 12,
  expirationDate: "2099-05-01",
  notes: null,
  createdAt: "2026-04-18T10:00:00.000Z",
  updatedAt: "2026-04-18T10:00:00.000Z",
};

describe("ItemCard stock flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows low-stock restock controls and handles duplicate restock state", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/api/inventory/inventory-1/restock-suggestion")) {
        return jsonResponse({
          status: "already-in-shopping-list",
          shoppingListItem: {
            id: "shopping-1",
            groupId: "group-1",
            createdBy: "user-1",
            createdByName: "Alice",
            purchasedBy: null,
            purchasedByName: null,
            name: "Telur ayam",
            category: "Makanan",
            quantity: 10,
            unit: "pcs",
            notes: null,
            isPurchased: false,
            purchasedAt: null,
            createdAt: "2026-04-18T10:00:00.000Z",
            updatedAt: "2026-04-18T10:00:00.000Z",
          },
        });
      }

      return jsonResponse({ error: { code: "NOT_FOUND", message: `Unhandled request: ${url}` } }, 404);
    });

    renderItemCard(baseItem);

    expect(screen.getByText("Stok rendah")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tambah ke Belanja/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Tambah ke Belanja/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/inventory/inventory-1/restock-suggestion"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("keeps zero-stock items visible with an out-of-stock badge", () => {
    renderItemCard({
      ...baseItem,
      quantity: 0,
    });

    expect(screen.getByText("0 pcs")).toBeInTheDocument();
    expect(screen.getByText("Stok habis")).toBeInTheDocument();
  });
});
