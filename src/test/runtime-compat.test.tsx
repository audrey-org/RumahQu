import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { getSystemNotificationPermission, registerAppServiceWorker } from "@/lib/browser-notifications";
import {
  isInAppBrowser,
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
} from "@/lib/runtime-compat";

describe("runtime compatibility", () => {
  const originalUserAgent = navigator.userAgent;
  const originalSecureContext = window.isSecureContext;

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: originalSecureContext,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
  });

  it("detects Threads and X style in-app browsers", () => {
    expect(isInAppBrowser("Mozilla/5.0 Threads/382.0")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 TwitterAndroid")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 WhatsApp/2.24.9.78 Mobile")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 Chrome/135.0.0.0 Safari/537.36")).toBe(false);
  });

  it("returns safe defaults when localStorage access throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    expect(safeLocalStorageGetItem("rumahqu:test")).toBeNull();
    expect(safeLocalStorageSetItem("rumahqu:test", "1")).toBe(false);
    expect(safeLocalStorageRemoveItem("rumahqu:test")).toBe(false);
  });

  it("disables notification features in in-app browsers", async () => {
    const register = vi.fn();
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 Threads/382.0",
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register,
        ready: Promise.resolve(null),
      },
    });

    expect(getSystemNotificationPermission()).toBe("unsupported");
    await expect(registerAppServiceWorker()).resolves.toBeNull();
    expect(register).not.toHaveBeenCalled();
  });
});

function CrashHarness() {
  throw new Error("boom");
  return null;
}

describe("AppErrorBoundary", () => {
  it("shows a recovery message instead of a blank screen", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const swallowWindowError = (event: ErrorEvent) => {
      event.preventDefault();
    };

    window.addEventListener("error", swallowWindowError);

    render(
      <AppErrorBoundary>
        <CrashHarness />
      </AppErrorBoundary>,
    );

    expect(screen.getByText("Halaman tidak bisa dimuat sempurna")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coba Muat Ulang" })).toBeInTheDocument();

    window.removeEventListener("error", swallowWindowError);
    consoleError.mockRestore();
  });
});
