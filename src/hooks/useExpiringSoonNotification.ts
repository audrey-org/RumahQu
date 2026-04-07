import { useEffect, useMemo, useRef, useState } from "react";
import {
  EXPIRING_SOON_THRESHOLD_DAYS,
  formatExpiryCountdown,
  getExpiringSoonItems,
  type InventoryItem,
} from "@/lib/inventory";
import {
  closeSystemNotifications,
  EXPIRY_NOTIFICATION_TAG,
  getSystemNotificationPermission,
  requestSystemNotificationPermission,
  showSystemNotification,
  supportsSystemNotifications,
  type SystemNotificationPermission,
} from "@/lib/browser-notifications";
import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
} from "@/lib/runtime-compat";

const LAST_EXPIRY_NOTIFICATION_KEY = "rumahqu:last-expiry-notification";

function readLastNotificationKey() {
  return safeLocalStorageGetItem(LAST_EXPIRY_NOTIFICATION_KEY);
}

function writeLastNotificationKey(value: string | null) {
  if (!value) {
    safeLocalStorageRemoveItem(LAST_EXPIRY_NOTIFICATION_KEY);
    return;
  }

  safeLocalStorageSetItem(LAST_EXPIRY_NOTIFICATION_KEY, value);
}

export function useExpiringSoonNotification(items: InventoryItem[], groupId?: string, groupName?: string | null) {
  const expiringSoonItems = useMemo(() => getExpiringSoonItems(items), [items]);
  const lastNotificationKeyRef = useRef<string | null>(null);
  const notificationsSupported = supportsSystemNotifications();
  const [notificationPermission, setNotificationPermission] = useState<SystemNotificationPermission>(() =>
    getSystemNotificationPermission(),
  );

  const notificationKey = useMemo(() => {
    if (expiringSoonItems.length === 0) return null;

    return [
      groupId ?? "no-group",
      ...expiringSoonItems.map((item) => `${item.id}:${item.expirationDate}:${item.updatedAt}`),
    ].join("|");
  }, [expiringSoonItems, groupId]);

  useEffect(() => {
    if (!notificationsSupported) return;

    const syncPermission = () => {
      setNotificationPermission(getSystemNotificationPermission());
    };

    syncPermission();
    window.addEventListener("focus", syncPermission);
    document.addEventListener("visibilitychange", syncPermission);

    return () => {
      window.removeEventListener("focus", syncPermission);
      document.removeEventListener("visibilitychange", syncPermission);
    };
  }, [notificationsSupported]);

  useEffect(() => {
    if (!notificationKey) {
      lastNotificationKeyRef.current = null;
      writeLastNotificationKey(null);
      void closeSystemNotifications(EXPIRY_NOTIFICATION_TAG);
      return;
    }

    if (notificationPermission !== "granted") {
      return;
    }

    const lastPersistedKey = readLastNotificationKey();
    if (notificationKey === lastNotificationKeyRef.current || notificationKey === lastPersistedKey) {
      return;
    }

    lastNotificationKeyRef.current = notificationKey;
    writeLastNotificationKey(notificationKey);

    const previewItems = expiringSoonItems.slice(0, 2);
    const remainingItems = expiringSoonItems.length - previewItems.length;
    const title =
      expiringSoonItems.length === 1
        ? "1 barang segera kedaluwarsa"
        : `${expiringSoonItems.length} barang segera kedaluwarsa`;
    const itemPreview = previewItems.map((item) => `${item.name} (${formatExpiryCountdown(item.expirationDate)})`).join(", ");
    const locationPrefix = groupName ? `${groupName}: ` : "";
    const suffix = remainingItems > 0 ? `, +${remainingItems} lainnya` : "";

    void showSystemNotification({
      title,
      body: `${locationPrefix}${itemPreview}${suffix}. Cek stok untuk ${EXPIRING_SOON_THRESHOLD_DAYS} hari ke depan.`,
      tag: EXPIRY_NOTIFICATION_TAG,
      url: "/inventory",
    });
  }, [expiringSoonItems, groupName, notificationKey, notificationPermission]);

  const enableNotifications = async () => {
    const nextPermission = await requestSystemNotificationPermission();
    setNotificationPermission(nextPermission);
    return nextPermission;
  };

  return {
    notificationsSupported,
    notificationPermission,
    enableNotifications,
  };
}
