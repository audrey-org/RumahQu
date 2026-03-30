export type SystemNotificationPermission = NotificationPermission | "unsupported";

interface SystemNotificationOptions {
  title: string;
  body: string;
  tag: string;
  url?: string;
}

export const EXPIRY_NOTIFICATION_TAG = "inventory-expiring-soon";

export function supportsSystemNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getSystemNotificationPermission(): SystemNotificationPermission {
  if (!supportsSystemNotifications()) return "unsupported";
  return Notification.permission;
}

export async function requestSystemNotificationPermission(): Promise<SystemNotificationPermission> {
  if (!supportsSystemNotifications()) return "unsupported";
  return Notification.requestPermission();
}

async function getServiceWorkerRegistration() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function showSystemNotification(options: SystemNotificationOptions) {
  if (getSystemNotificationPermission() !== "granted") return false;

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
}

export async function closeSystemNotifications(tag: string) {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return;

  const notifications = await registration.getNotifications({ tag });
  notifications.forEach((notification) => notification.close());
}

export async function registerAppServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}
