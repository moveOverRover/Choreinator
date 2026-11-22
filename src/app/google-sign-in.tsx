"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type Gsi = {
  accounts: {
    id: {
      initialize(opts: Record<string, unknown>): void;
      renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
    };
  };
};

/** Apps whose built-in browsers break or block Google sign-in. */
const IN_APP = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|Snapchat|TikTok/i;

/**
 * "Sign in with Google" button (Google Identity Services) in redirect mode:
 * Google sends the user back to /api/auth/google, which signs them in.
 */
export function GoogleSignIn({ clientId, failed }: { clientId: string; failed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    // Detecting the browser has to happen on the client, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInApp(IN_APP.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    const google = (window as unknown as { google?: Gsi }).google;
    if (!loaded || !google || !ref.current) return;
    google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: "redirect",
      login_uri: `${window.location.origin}/api/auth/google`,
    });
    google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", text: "continue_with" });
  }, [loaded, clientId]);

  return (
    <div className="flex flex-col items-center gap-3">
      {inApp && (
        <p className="rounded-md bg-warn-bg p-3 text-left text-sm">
          You opened this inside another app (like Messenger). Google sign-in may not work here. Tap the{" "}
          <b>⋯</b> or share menu and choose <b>Open in Safari</b> / <b>Open in Chrome</b>, then sign in.
        </p>
      )}
      <Script src="https://accounts.google.com/gsi/client" onReady={() => setLoaded(true)} />
      <div ref={ref} className="min-h-11" />
      {failed && <p className="text-sm text-bad">Sign-in didn&apos;t work. Please try again.</p>}
    </div>
  );
}
