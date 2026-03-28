import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpiringSoonAlert } from "@/components/ExpiringSoonAlert";
import { useExpiringSoonNotification } from "@/hooks/useExpiringSoonNotification";
import type { InventoryItem } from "@/lib/contracts";

const { warningMock, dismissMock } = vi.hoisted(() => ({
  warningMock: vi.fn(),
  dismissMock: vi.fn(),
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: {
    warning: warningMock,
    dismiss: dismissMock,
  },
}));

function NotificationHarness({ items }: { items: InventoryItem[] }) {
  useExpiringSoonNotification(items, "group-1", "Rumah Alice");
  return <ExpiringSoonAlert items={items} />;
}

describe("expiring soon notification", () => {
  beforeEach(() => {
    warningMock.mockClear();
    dismissMock.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows an alert and triggers a toast for items that will expire soon", () => {
    const items: InventoryItem[] = [
      {
        id: "item-1",
        groupId: "group-1",
        addedBy: "user-1",
        addedByName: "Alice Rumah",
        name: "Susu UHT",
        category: "Minuman",
        quantity: 2,
        unit: "kotak",
        expirationDate: "2026-04-02",
        notes: null,
        createdAt: "2026-03-28T00:00:00.000Z",
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
      {
        id: "item-2",
        groupId: "group-1",
        addedBy: "user-1",
        addedByName: "Alice Rumah",
        name: "Beras",
        category: "Makanan",
        quantity: 1,
        unit: "kg",
        expirationDate: "2026-04-20",
        notes: null,
        createdAt: "2026-03-28T00:00:00.000Z",
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
    ];

    render(<NotificationHarness items={items} />);

    expect(screen.getByText("Notifikasi stok")).toBeInTheDocument();
    expect(screen.getByText("Ada 1 barang yang akan kadaluarsa dalam 7 hari ke depan.")).toBeInTheDocument();
    expect(screen.getByText("Susu UHT")).toBeInTheDocument();
    expect(screen.getAllByText(/5 hari lagi/i).length).toBeGreaterThan(0);

    expect(warningMock).toHaveBeenCalledTimes(1);
    expect(warningMock).toHaveBeenCalledWith(
      "1 barang segera kedaluwarsa",
      expect.objectContaining({
        id: "inventory-expiring-soon",
        description: "Rumah Alice: Susu UHT (5 hari lagi). Cek stok untuk 7 hari ke depan.",
        duration: 6000,
        position: "top-right",
      }),
    );
  });

  it("does not show an alert when all items are still safe", () => {
    const items: InventoryItem[] = [
      {
        id: "item-3",
        groupId: "group-1",
        addedBy: "user-1",
        addedByName: "Alice Rumah",
        name: "Gula",
        category: "Makanan",
        quantity: 1,
        unit: "kg",
        expirationDate: "2026-04-15",
        notes: null,
        createdAt: "2026-03-28T00:00:00.000Z",
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
    ];

    render(<NotificationHarness items={items} />);

    expect(screen.queryByText("Notifikasi stok")).not.toBeInTheDocument();
    expect(warningMock).not.toHaveBeenCalled();
    expect(dismissMock).toHaveBeenCalledWith("inventory-expiring-soon");
  });
});
