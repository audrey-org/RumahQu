const IN_APP_BROWSER_PATTERNS = [
  /Threads/i,
  /Instagram/i,
  /\bFBAN\b/i,
  /\bFBAV\b/i,
  /\bFB_IAB\b/i,
  /Twitter/i,
  /\bWhatsApp\b/i,
  /\bLine\//i,
  /LinkedInApp/i,
];

function getNavigatorObject() {
  if (typeof navigator === "undefined") return null;
  return navigator;
}

export function getUserAgent() {
  return getNavigatorObject()?.userAgent ?? "";
}

export function isInAppBrowser(userAgent = getUserAgent()) {
  return IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function safeLocalStorageGetItem(key: string) {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageSetItem(key: string, value: string) {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageRemoveItem(key: string) {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
