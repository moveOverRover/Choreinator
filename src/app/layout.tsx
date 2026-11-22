import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { signOutAction } from "./actions";
import { currentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Choreinator",
  description: "The house chore lottery",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  const approved = user?.status === "approved";
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              🎲 Choreinator
            </Link>
            {approved && (
              <nav className="flex flex-wrap gap-3 text-sm">
                <Link href="/preferences" className="hover:underline">My picks</Link>
                <Link href="/board" className="hover:underline">Chore board</Link>
                {user.role === "admin" && (
                  <Link href="/admin" className="hover:underline">Admin</Link>
                )}
              </nav>
            )}
            {user && (
              <form action={signOutAction} className="ml-auto flex items-center gap-2 text-sm text-muted">
                <span className="hidden sm:inline">{user.name || user.email}</span>
                <button className="rounded border border-line px-2 py-1 hover:bg-canvas">Sign out</button>
              </form>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
