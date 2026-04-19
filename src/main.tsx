import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function showBootFallback() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const fallback = document.getElementById("boot-fallback");
  const link = document.getElementById("boot-fallback-link");

  if (link instanceof HTMLAnchorElement) {
    link.href = window.location.href;
  }

  if (fallback instanceof HTMLElement) {
    fallback.hidden = false;
  }

  document.body.style.background = "#faf7f2";
}

try {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Root element #root was not found");
  }

  createRoot(rootElement).render(<App />);
} catch (error) {
  console.error("Fatal app bootstrap error", error);
  showBootFallback();
}
