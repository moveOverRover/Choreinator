import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { signIn, verifyGoogleCredential } from "@/lib/auth";

// Google "redirect mode" sign-in: Google POSTs the signed-in user's ID token here
// as a form (fields: credential, g_csrf_token). Used instead of a pop-up because
// pop-ups break when the link is opened from Messenger/Instagram on phones.
export async function POST(req: NextRequest) {
  const home = new URL("/", req.url);
  try {
    const form = await req.formData();
    const credential = String(form.get("credential") ?? "");
    const csrfBody = String(form.get("g_csrf_token") ?? "");
    const csrfCookie = (await cookies()).get("g_csrf_token")?.value;
    // Double-submit CSRF check required by Google for redirect mode.
    if (!credential || !csrfBody || csrfBody !== csrfCookie) {
      home.searchParams.set("signin", "failed");
      return NextResponse.redirect(home, 303);
    }
    const { email, name } = await verifyGoogleCredential(credential);
    await signIn(email, name);
  } catch (e) {
    console.error("Google redirect sign-in failed", e);
    home.searchParams.set("signin", "failed");
  }
  return NextResponse.redirect(home, 303);
}
