"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth";
import { activeChores, lotteryPeople } from "@/lib/domain";
import { runLottery } from "@/lib/lottery";
import { newSeed } from "@/lib/rng";
import { readDb, slug, store } from "@/lib/store";
import type { AssignmentMethod, Chore, Round, UserRole, UserStatus } from "@/lib/types";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const done = () => revalidatePath("/", "layout");

// ---------- Residents ----------

export async function updateUserAction(fd: FormData) {
  const admin = await assertAdmin();
  const db = await readDb(true);
  const email = s(fd, "email").toLowerCase();
  const u = db.users.find((x) => x.email === email);
  if (!u) throw new Error("No such user.");
  const status = (s(fd, "status") || u.status) as UserStatus;
  const role = (s(fd, "role") || u.role) as UserRole;
  if (email === admin.email && (role !== "admin" || status !== "approved")) {
    throw new Error("You can't remove your own admin access.");
  }
  await store.saveUser({
    ...u,
    name: fd.has("name") ? s(fd, "name") || u.name : u.name,
    formName: fd.has("formName") ? s(fd, "formName") : u.formName,
    status,
    role,
    participates: fd.has("participatesField") ? fd.get("participates") === "on" : u.participates,
  });
  done();
}

/** Pre-approve people by email (one per line, optionally "email, Name"). */
export async function addUsersAction(fd: FormData) {
  await assertAdmin();
  const db = await readDb(true);
  const lines = s(fd, "emails").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const [rawEmail, ...rest] = line.split(/[,\t;]/);
    const email = rawEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
    const name = rest.join(" ").trim();
    const existing = db.users.find((u) => u.email === email);
    await store.saveUser({
      email,
      name: name || existing?.name || "",
      status: "approved",
      role: existing?.role ?? "resident",
      formName: existing?.formName || name.split(/\s+/)[0] || "",
      participates: existing?.participates ?? true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
  }
  done();
}

// ---------- Chores ----------

export async function saveChoreAction(fd: FormData) {
  await assertAdmin();
  const db = await readDb(true);
  const name = s(fd, "name");
  if (!name) throw new Error("Chore needs a name.");
  let id = s(fd, "id");
  if (!id) {
    id = slug(name);
    let n = 2;
    while (db.chores.some((c) => c.id === id)) id = `${slug(name)}-${n++}`;
  }
  const prev = db.chores.find((c) => c.id === id);
  const chore: Chore = {
    id,
    name,
    description: s(fd, "description"),
    slots: Math.max(0, Math.min(50, Math.floor(Number(s(fd, "slots")) || 1))),
    active: fd.has("activeField") ? fd.get("active") === "on" : (prev?.active ?? true),
    formLabel: s(fd, "formLabel") || name.toUpperCase(),
    sortOrder: prev?.sortOrder ?? Math.max(0, ...db.chores.map((c) => c.sortOrder)) + 1,
  };
  await store.saveChore(chore);
  done();
}

export async function deleteChoreAction(fd: FormData) {
  await assertAdmin();
  const id = s(fd, "id");
  const db = await readDb(true);
  if (db.assignments.some((a) => a.choreId === id) || db.preferences.some((p) => [p.veto, p.choice1, p.choice2, p.choice3].includes(id))) {
    throw new Error("This chore is used in a round. Turn it off (inactive) instead of deleting it.");
  }
  await store.deleteChore(id);
  done();
}

// ---------- Rounds ----------

export async function createRoundAction(fd: FormData) {
  await assertAdmin();
  const db = await readDb(true);
  if (db.rounds.some((r) => r.status !== "published")) {
    throw new Error("Finish (publish) the current round before starting a new one.");
  }
  const now = new Date().toISOString();
  const round: Round = {
    id: `r${Date.now().toString(36)}`,
    name: s(fd, "name") || `Chores ${now.slice(0, 7)}`,
    status: "open",
    createdAt: now,
    seed: "",
    drawnAt: "",
    publishedAt: "",
    startsOn: s(fd, "startsOn"),
    drawCount: 0,
  };
  await store.saveRound(round);
  done();
  redirect(`/admin/rounds/${round.id}`);
}

async function loadRound(id: string) {
  const db = await readDb(true);
  const round = db.rounds.find((r) => r.id === id);
  if (!round) throw new Error("Round not found.");
  return { db, round };
}

export async function setRoundStatusAction(fd: FormData) {
  await assertAdmin();
  const { round } = await loadRound(s(fd, "roundId"));
  const to = s(fd, "status") as Round["status"];
  const allowed: Record<string, Round["status"][]> = {
    open: ["closed"],
    closed: ["open"],
    drawn: ["published", "open"],
    published: ["drawn"],
  };
  if (!allowed[round.status]?.includes(to)) throw new Error(`Can't go from ${round.status} to ${to}.`);
  await store.saveRound({
    ...round,
    status: to,
    publishedAt: to === "published" ? new Date().toISOString() : round.publishedAt,
  });
  done();
}

export async function updateRoundAction(fd: FormData) {
  await assertAdmin();
  const { round } = await loadRound(s(fd, "roundId"));
  await store.saveRound({ ...round, name: s(fd, "name") || round.name, startsOn: s(fd, "startsOn") });
  done();
}

export async function runLotteryAction(fd: FormData) {
  await assertAdmin();
  const { db, round } = await loadRound(s(fd, "roundId"));
  if (round.status !== "closed" && round.status !== "drawn") {
    throw new Error("Close picking before running the lottery.");
  }
  const chores = activeChores(db);
  const prefs = new Map(db.preferences.filter((p) => p.roundId === round.id).map((p) => [p.email, p]));
  // Sort by email so the draw only depends on the seed, not on sheet row order.
  const people = lotteryPeople(db).sort((a, b) => a.email.localeCompare(b.email));
  const seed = newSeed();
  const result = runLottery(
    chores.map((c) => ({ id: c.id, name: c.name, slots: c.slots })),
    people.map((u) => {
      const p = prefs.get(u.email);
      return {
        id: u.email,
        name: u.name || u.email,
        veto: p?.veto || undefined,
        // Keep blanks so a skipped rank stays skipped (see runLottery).
        choices: p ? [p.choice1, p.choice2, p.choice3] : [],
      };
    }),
    seed,
  );
  const noPrefs = people.filter((u) => !prefs.has(u.email)).map((u) => u.name || u.email);
  const log = [
    ...(noPrefs.length ? [`Did not submit picks (treated as leftovers): ${noPrefs.join(", ")}.`] : []),
    ...result.log,
  ];
  await store.replaceAssignments(
    round.id,
    result.assignments.map((a) => ({
      roundId: round.id,
      email: a.participantId,
      choreId: a.choreId,
      method: a.method,
      note: "",
    })),
  );
  await store.replaceLog(round.id, log.map((text, i) => ({ roundId: round.id, seq: i + 1, text })));
  await store.saveRound({
    ...round,
    status: "drawn",
    seed,
    drawnAt: new Date().toISOString(),
    drawCount: (round.drawCount || 0) + 1,
  });
  done();
}

/** Admin override: change (or clear) one person's chore for a round. */
export async function setAssignmentAction(fd: FormData) {
  const admin = await assertAdmin();
  const { db, round } = await loadRound(s(fd, "roundId"));
  const email = s(fd, "email").toLowerCase();
  const choreId = s(fd, "choreId");
  if (!choreId) {
    await store.deleteAssignment(round.id, email);
  } else {
    if (!db.chores.some((c) => c.id === choreId)) throw new Error("Unknown chore.");
    const prev = db.assignments.find((a) => a.roundId === round.id && a.email === email);
    if (prev?.choreId === choreId) return;
    await store.saveAssignment({
      roundId: round.id,
      email,
      choreId,
      method: "manual" as AssignmentMethod,
      note: `Changed by ${admin.name || admin.email}${prev ? ` (was ${db.chores.find((c) => c.id === prev.choreId)?.name ?? prev.choreId})` : ""}`,
    });
  }
  done();
}

// ---------- Tracking ----------

export async function logMissesAction(fd: FormData) {
  const admin = await assertAdmin();
  const db = await readDb(true);
  const weekStart = s(fd, "weekStart");
  const emails = fd.getAll("missed").map((v) => String(v).toLowerCase());
  const already = new Set(db.missed.filter((m) => m.weekStart === weekStart).map((m) => m.email));
  const now = new Date().toISOString();
  const rows = emails
    .filter((e) => !already.has(e))
    .map((email) => {
      const u = db.users.find((x) => x.email === email);
      return {
        weekStart,
        email,
        name: u?.name ?? email,
        chore: s(fd, `chore:${email}`),
        loggedAt: now,
        loggedBy: admin.email,
      };
    });
  if (rows.length) await store.addMissed(rows);
  done();
}
