"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertApproved, devLoginEnabled, signIn, signOut, verifyGoogleCredential } from "@/lib/auth";
import { activeChores, currentRound } from "@/lib/domain";
import { readDb, store } from "@/lib/store";

export async function googleSignInAction(credential: string): Promise<{ error?: string }> {
  try {
    const { email, name } = await verifyGoogleCredential(credential);
    await signIn(email, name);
  } catch (e) {
    console.error("Google sign-in failed", e);
    return { error: "Google sign-in failed. Please try again." };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function devSignInAction(formData: FormData) {
  if (!devLoginEnabled()) throw new Error("Dev login is disabled.");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || email.split("@")[0];
  if (!email.includes("@")) throw new Error("Enter an email.");
  await signIn(email, name);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOutAction() {
  await signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export type PrefsState = { ok?: boolean; error?: string };

export async function savePreferencesAction(_prev: PrefsState, formData: FormData): Promise<PrefsState> {
  const user = await assertApproved();
  const db = await readDb(true);
  const round = currentRound(db);
  if (!round || round.status !== "open") return { error: "Chore picking is closed right now." };

  const valid = new Set(activeChores(db).map((c) => c.id));
  const get = (k: string) => {
    const v = String(formData.get(k) ?? "");
    return valid.has(v) ? v : "";
  };
  const veto = get("veto");
  // Every pick is optional: blank means "no preference". Leaving everything blank is
  // allowed too, and simply records that this person doesn't mind what they get.
  const choices = [get("choice1"), get("choice2"), get("choice3")];
  const picked = choices.filter(Boolean);

  if (new Set(picked).size !== picked.length) return { error: "Your choices must be different chores." };
  if (veto && picked.includes(veto)) return { error: "Your choices can't include the chore you can't do." };

  await store.savePreference({
    roundId: round.id,
    email: user.email,
    veto,
    choice1: choices[0],
    choice2: choices[1],
    choice3: choices[2],
    updatedAt: new Date().toISOString(),
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
