"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { endAdminSession, isAdmin, passwordOk, startAdminSession } from "@/lib/admin-auth";
import { runAll } from "@/lib/sync/run";
import { SITE_URL } from "@/lib/site";

// a crude brake on password guessing: after 8 wrong tries in a minute from one isolate, wait
let fails: number[] = [];

export async function login(_: { error?: string } | null, form: FormData): Promise<{ error?: string }> {
  const now = Date.now();
  fails = fails.filter((t) => now - t < 60_000);
  if (fails.length >= 8) return { error: "Too many tries. Wait a minute." };
  if (!passwordOk(String(form.get("password") ?? ""))) {
    fails.push(now);
    return { error: "Wrong password." };
  }
  await startAdminSession();
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin/login");
}

export async function syncNow(form: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const only = String(form.get("only") ?? "") || undefined;
  await runAll(db, { siteUrl: SITE_URL, force: true, only });
  revalidatePath("/", "layout");
  redirect("/admin");
}
