import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerAppServiceWorker } from "@/lib/browser-notifications";

void registerAppServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
