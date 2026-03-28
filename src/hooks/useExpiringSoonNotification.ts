import { useEffect, useMemo, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import {
  EXPIRING_SOON_THRESHOLD_DAYS,
  formatExpiryCountdown,
  getExpiringSoonItems,
  type InventoryItem,
} from "@/lib/inventory";

const EXPIRY_NOTIFICATION_ID = "inventory-expiring-soon";

export function useExpiringSoonNotification(items: InventoryItem[], groupId?: string, groupName?: string | null) {
  const expiringSoonItems = useMemo(() => getExpiringSoonItems(items), [items]);
  const lastNotificationKeyRef = useRef<string | null>(null);

  const notificationKey = useMemo(() => {
    if (expiringSoonItems.length === 0) return null;

    return [
      groupId ?? "no-group",
      ...expiringSoonItems.map((item) => `${item.id}:${item.expirationDate}:${item.updatedAt}`),
    ].join("|");
  }, [expiringSoonItems, groupId]);

  useEffect(() => {
    if (!notificationKey) {
      lastNotificationKeyRef.current = null;
      toast.dismiss(EXPIRY_NOTIFICATION_ID);
      return;
    }

    if (notificationKey === lastNotificationKeyRef.current) {
      return;
    }

    lastNotificationKeyRef.current = notificationKey;

    const previewItems = expiringSoonItems.slice(0, 2);
    const remainingItems = expiringSoonItems.length - previewItems.length;
    const title =
      expiringSoonItems.length === 1
        ? "1 barang segera kedaluwarsa"
        : `${expiringSoonItems.length} barang segera kedaluwarsa`;
    const itemPreview = previewItems.map((item) => `${item.name} (${formatExpiryCountdown(item.expirationDate)})`).join(", ");
    const locationPrefix = groupName ? `${groupName}: ` : "";
    const suffix = remainingItems > 0 ? `, +${remainingItems} lainnya` : "";

    toast.warning(title, {
      id: EXPIRY_NOTIFICATION_ID,
      description: `${locationPrefix}${itemPreview}${suffix}. Cek stok untuk ${EXPIRING_SOON_THRESHOLD_DAYS} hari ke depan.`,
      duration: 6000,
      position: "top-right",
    });
  }, [expiringSoonItems, groupName, notificationKey]);
}
