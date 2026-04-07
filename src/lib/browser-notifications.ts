import { isInAppBrowser } from "@/lib/runtime-compat";

export type SystemNotificationPermission = NotificationPermission | "unsupported";

interface SystemNotificationOptions {
  title: string;
  body: string;
  tag: string;
  url?: string;
}

export const EXPIRY_NOTIFICATION_TAG = "inventory-expiring-soon";

function canUseNotificationsApi() {
  return typeof window !== "undefined" && "Notification" in window && !isInAppBrowser();
}

export function supportsSystemNotifications() {
  return canUseNotificationsApi();
}

export function getSystemNotificationPermission(): SystemNotificationPermission {
  if (!supportsSystemNotifications()) return "unsupported";

  try {
    return Notification.permission;
  } catch {
    return "unsupported";
  }
}

export async function requestSystemNotificationPermission(): Promise<SystemNotificationPermission> {
  if (!supportsSystemNotifications()) return "unsupported";

  try {
    return await Notification.requestPermission();
  } catch {
    return "unsupported";
  }
}

async function getServiceWorkerRegistration() {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    typeof window === "undefined" ||
    !window.isSecureContext ||
    isInAppBrowser()
  ) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function showSystemNotification(options: SystemNotificationOptions) {
  if (getSystemNotificationPermission() !== "granted") return false;

  try {
    const registration = await getServiceWorkerRegistration();
    const notificationOptions = {
      body: options.body,
      tag: options.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: {
        url: options.url ?? "/inventory",
      },
    };

    if (registration) {
      await registration.showNotification(options.title, notificationOptions);
      return true;
    }

    new Notification(options.title, notificationOptions);
    return true;
  } catch {
    return false;
  }
}

export async function closeSystemNotifications(tag: string) {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) return;

    const notifications = await registration.getNotifications({ tag });
    notifications.forEach((notification) => notification.close());
  } catch {
    // Some embedded browsers expose partial Notification APIs that throw at runtime.
  }
}

export async function registerAppServiceWorker() {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    typeof window === "undefined" ||
    !window.isSecureContext ||
    isInAppBrowser()
  ) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}
