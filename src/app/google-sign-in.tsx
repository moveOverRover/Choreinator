"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { googleSignInAction } from "./actions";

type Gsi = {
  accounts: {
    id: {
      initialize(opts: { client_id: string; callback: (r: { credential: string }) => void }): void;
      renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
    };
  };
};

/** "Sign in with Google" button (Google Identity Services). */
export function GoogleSignIn({ clientId }: { clientId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const google = (window as unknown as { google?: Gsi }).google;
    if (!loaded || !google || !ref.current) return;
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        setBusy(true);
        const res = await googleSignInAction(credential);
        if (res.error) {
          setError(res.error);
          setBusy(false);
        } else {
          router.refresh();
        }
      },
    });
    google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", text: "continue_with" });
  }, [loaded, clientId, router]);

  return (
    <div className="flex flex-col items-center gap-2">
      <Script src="https://accounts.google.com/gsi/client" onReady={() => setLoaded(true)} />
      <div ref={ref} className="min-h-11" />
      {busy && <p className="text-sm text-muted">Signing you in…</p>}
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
