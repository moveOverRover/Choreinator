import "server-only";
import { OAuth2Client } from "google-auth-library";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readDb, store } from "./store";
import type { User } from "./types";

// Sessions are a signed JWT in an httpOnly cookie. The cookie only proves who the
// person is (their Google email); their status and role are always read fresh
// from the Users tab, so approving/disabling someone takes effect immediately.

const COOKIE = "choreinator_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be at least 32 characters.");
    return new TextEncoder().encode("dev-only-insecure-secret-do-not-use-in-production!");
  }
  return new TextEncoder().encode(s);
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Dev login (type any email) only when explicitly enabled AND not in production. */
export function devLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN === "1";
}

export async function verifyGoogleCredential(credential: string) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.");
  const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
  const p = ticket.getPayload();
  if (!p?.email || !p.email_verified) throw new Error("Google account has no verified email.");
  return { email: p.email.toLowerCase(), name: p.name || p.given_name || p.email.split("@")[0] };
}

/** Create the user row if new (pending, or approved admin if listed in ADMIN_EMAILS), then set the cookie. */
export async function signIn(email: string, name: string) {
  email = email.toLowerCase();
  const db = await readDb(true);
  const existing = db.users.find((u) => u.email === email);
  const isAdmin = adminEmails().includes(email);
  if (!existing) {
    await store.saveUser({
      email,
      name,
      status: isAdmin ? "approved" : "pending",
      role: isAdmin ? "admin" : "resident",
      formName: name.split(/\s+/)[0],
      participates: true,
      createdAt: new Date().toISOString(),
    });
  } else if (isAdmin && (existing.role !== "admin" || existing.status !== "approved")) {
    await store.saveUser({ ...existing, role: "admin", status: "approved" });
  } else if (!existing.name && name) {
    // Pre-added by an admin with only an email: fill in the name from Google.
    await store.saveUser({ ...existing, name });
  }

  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in user (any status), or null. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const email = String(payload.email ?? "").toLowerCase();
    if (!email) return null;
    const db = await readDb();
    return db.users.find((u) => u.email === email) ?? null;
  } catch {
    return null;
  }
}

/** For pages: redirect away unless approved. */
export async function requireApproved(): Promise<User> {
  const u = await currentUser();
  if (!u || u.status !== "approved") redirect("/");
  return u;
}

/** For pages: redirect away unless admin. */
export async function requireAdmin(): Promise<User> {
  const u = await requireApproved();
  if (u.role !== "admin") redirect("/");
  return u;
}

/** For server actions: throw instead of redirecting. */
export async function assertApproved(): Promise<User> {
  const u = await currentUser();
  if (!u || u.status !== "approved") throw new Error("Not signed in or not approved yet.");
  return u;
}

export async function assertAdmin(): Promise<User> {
  const u = await assertApproved();
  if (u.role !== "admin") throw new Error("Admins only.");
  return u;
}
