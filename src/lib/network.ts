import { useEffect, useState } from "react";

/**
 * App connectivity for the offline banner.
 *
 * `navigator.onLine` is often `false` on Linux even when localhost works.
 * Always start as online (matches SSR) and only flip after a real `offline`
 * event that also fails a same-origin probe.
 */
export function useNetworkOnline(): {
  online: boolean;
  markOnline: () => void;
  retry: () => Promise<boolean>;
} {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const probe = async (): Promise<boolean> => {
      try {
        const response = await fetch(`/favicon.svg?ping=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
        });
        return response.ok;
      } catch {
        return false;
      }
    };

    const on = () => setOnline(true);
    const off = () => {
      void probe().then((ok) => {
        if (!cancelled) setOnline(ok);
      });
    };

    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      cancelled = true;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const retry = async (): Promise<boolean> => {
    try {
      const response = await fetch(`/favicon.svg?ping=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
      });
      const ok = response.ok;
      setOnline(ok);
      return ok;
    } catch {
      setOnline(false);
      return false;
    }
  };

  return {
    online,
    markOnline: () => setOnline(true),
    retry,
  };
}
