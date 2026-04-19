import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShoppingListItemRow } from "@/components/ShoppingListItemRow";
import type { ShoppingListItem } from "@/lib/contracts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderRow(item: ShoppingListItem) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ShoppingListItemRow item={item} groupId="group-1" />
    </QueryClientProvider>,
  );
}

const purchasedItem: ShoppingListItem = {
  id: "shopping-1",
  groupId: "group-1",
  createdBy: "user-1",
  createdByName: "Alice",
  purchasedBy: "user-1",
  purchasedByName: "Alice",
  name: "Telur ayam",
  category: "Makanan",
  quantity: 12,
  unit: "pcs",
  notes: "Beli ukuran besar",
  isPurchased: true,
  purchasedAt: "2026-04-18T10:00:00.000Z",
  createdAt: "2026-04-18T09:00:00.000Z",
  updatedAt: "2026-04-18T10:00:00.000Z",
};

describe("ShoppingListItemRow inventory intake", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a prefilled inventory dialog for purchased shopping items", async () => {
    renderRow(purchasedItem);

    fireEvent.click(screen.getByRole("button", { name: /Tambah ke Inventory/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Nama Barang")).toHaveValue("Telur ayam");
    expect(screen.getByLabelText("Jumlah")).toHaveValue(12);
    expect(screen.getByLabelText("Catatan (opsional)")).toHaveValue("Beli ukuran besar");
    expect(screen.getAllByText("Makanan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("pcs").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Simpan" })).toBeDisabled();
  });

  it("creates inventory from the prefilled dialog without removing the purchased row", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/api/inventory") && init && typeof init !== "function") {
        return jsonResponse({
          id: "inventory-1",
          groupId: "group-1",
          addedBy: "user-1",
          addedByName: "Alice",
          name: "Telur ayam",
          category: "Makanan",
          quantity: 12,
          unit: "pcs",
          lowStockThreshold: null,
          restockTargetQuantity: null,
          expirationDate: "2026-05-01",
          notes: "Beli ukuran besar",
          createdAt: "2026-04-18T10:00:00.000Z",
          updatedAt: "2026-04-18T10:00:00.000Z",
        }, 201);
      }

      return jsonResponse({ error: { code: "NOT_FOUND", message: `Unhandled request: ${url}` } }, 404);
    });

    renderRow(purchasedItem);

    fireEvent.click(screen.getByRole("button", { name: /Tambah ke Inventory/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Pilih tanggal" }));

    const calendarGrid = await screen.findByRole("grid");
    const dayButton = calendarGrid.querySelector("button:not([disabled])");
    expect(dayButton).not.toBeNull();
    fireEvent.click(dayButton!);

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/inventory"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Telur ayam"'),
        }),
      );
    });

    expect(screen.getByText("Telur ayam")).toBeInTheDocument();
    expect(screen.getByText("Sudah dibeli")).toBeInTheDocument();
  });
});
