import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { APP_NAME } from "@/lib/brand";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError() {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled app error", error, errorInfo);
  }

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const currentUrl = typeof window !== "undefined" ? window.location.href : "/";

    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,hsl(36_33%_98%),hsl(var(--background))_26%)] p-4 text-foreground">
        <div className="w-full max-w-lg rounded-[2rem] border border-border/70 bg-card/95 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.1)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="mt-5 text-center">
            <h1 className="text-2xl font-extrabold">Halaman tidak bisa dimuat sempurna</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {APP_NAME} mendeteksi error runtime. Ini sering terjadi di in-app browser seperti Threads atau X yang
              membatasi sebagian fitur web modern.
            </p>
          </div>
          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-95"
            >
              <RefreshCw className="h-4 w-4" />
              Coba Muat Ulang
            </button>
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-bold"
            >
              <ExternalLink className="h-4 w-4" />
              Buka di Browser Utama
            </a>
          </div>
          <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
            Jika tombol kedua tetap membuka in-app browser yang sama, gunakan menu titik tiga lalu pilih Open in
            Browser.
          </p>
        </div>
      </div>
    );
  }
}
