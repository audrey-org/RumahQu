import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpiringSoonAlert } from "@/components/ExpiringSoonAlert";
import { useExpiringSoonNotification } from "@/hooks/useExpiringSoonNotification";
import type { InventoryItem } from "@/lib/contracts";

const {
  closeSystemNotificationsMock,
  getSystemNotificationPermissionMock,
  requestSystemNotificationPermissionMock,
  showSystemNotificationMock,
  supportsSystemNotificationsMock,
} = vi.hoisted(() => ({
  closeSystemNotificationsMock: vi.fn(),
  getSystemNotificationPermissionMock: vi.fn(),
  requestSystemNotificationPermissionMock: vi.fn(),
  showSystemNotificationMock: vi.fn(),
  supportsSystemNotificationsMock: vi.fn(),
}));

vi.mock("@/lib/browser-notifications", () => ({
  EXPIRY_NOTIFICATION_TAG: "inventory-expiring-soon",
  closeSystemNotifications: closeSystemNotificationsMock,
  getSystemNotificationPermission: getSystemNotificationPermissionMock,
  requestSystemNotificationPermission: requestSystemNotificationPermissionMock,
  showSystemNotification: showSystemNotificationMock,
  supportsSystemNotifications: supportsSystemNotificationsMock,
}));

function NotificationHarness({ items }: { items: InventoryItem[] }) {
  const { notificationsSupported, notificationPermission, enableNotifications } = useExpiringSoonNotification(
    items,
    "group-1",
    "Rumah Alice",
  );

  return (
    <ExpiringSoonAlert
      items={items}
      notificationSupported={notificationsSupported}
      notificationPermission={notificationPermission}
      onEnableNotifications={() => void enableNotifications()}
    />
  );
}

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("expiring soon notification", () => {
  beforeEach(() => {
    closeSystemNotificationsMock.mockClear();
    getSystemNotificationPermissionMock.mockClear();
    requestSystemNotificationPermissionMock.mockClear();
    showSystemNotificationMock.mockClear();
    supportsSystemNotificationsMock.mockClear();
    supportsSystemNotificationsMock.mockReturnValue(true);
    getSystemNotificationPermissionMock.mockReturnValue("granted");
    requestSystemNotificationPermissionMock.mockResolvedValue("granted");
    showSystemNotificationMock.mockResolvedValue(true);
    closeSystemNotificationsMock.mockResolvedValue(undefined);
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows an alert and triggers a browser notification for items that will expire soon", async () => {
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
        lowStockThreshold: null,
        restockTargetQuantity: null,
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
        lowStockThreshold: null,
        restockTargetQuantity: null,
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

    await flushEffects();
    expect(showSystemNotificationMock).toHaveBeenCalledTimes(1);
    expect(showSystemNotificationMock).toHaveBeenCalledWith({
      title: "1 barang segera kedaluwarsa",
      body: "Rumah Alice: Susu UHT (5 hari lagi). Cek stok untuk 7 hari ke depan.",
      tag: "inventory-expiring-soon",
      url: "/inventory",
    });
  });

  it("shows a browser notification permission action when permission is not granted", () => {
    getSystemNotificationPermissionMock.mockReturnValue("default");

    const items: InventoryItem[] = [
      {
        id: "item-4",
        groupId: "group-1",
        addedBy: "user-1",
        addedByName: "Alice Rumah",
        name: "Yogurt",
        category: "Minuman",
        quantity: 1,
        unit: "botol",
        lowStockThreshold: null,
        restockTargetQuantity: null,
        expirationDate: "2026-04-01",
        notes: null,
        createdAt: "2026-03-28T00:00:00.000Z",
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
    ];

    render(<NotificationHarness items={items} />);

    expect(screen.getByRole("button", { name: "Aktifkan notifikasi browser" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aktifkan notifikasi browser" }));

    expect(requestSystemNotificationPermissionMock).toHaveBeenCalledTimes(1);
  });

  it("does not show an alert when all items are still safe", async () => {
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
        lowStockThreshold: null,
        restockTargetQuantity: null,
        expirationDate: "2026-04-15",
        notes: null,
        createdAt: "2026-03-28T00:00:00.000Z",
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
    ];

    render(<NotificationHarness items={items} />);

    expect(screen.queryByText("Notifikasi stok")).not.toBeInTheDocument();
    expect(showSystemNotificationMock).not.toHaveBeenCalled();
    await flushEffects();
    expect(closeSystemNotificationsMock).toHaveBeenCalledWith("inventory-expiring-soon");
  });
});
