import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// A single shared admin password (ADMIN_PASSWORD) and a signed 12 hour cookie. Enough for one
// team; swap for real accounts when the client wants several people with different rights.

const COOKIE = "ga_admin";
const key = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ characters)");
  return new TextEncoder().encode(s);
};

export function passwordOk(given: string): boolean {
  const real = process.env.ADMIN_PASSWORD ?? "";
  if (real.length < 12) return false;
  const a = Buffer.from(real);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startAdminSession() {
  const token = await new SignJWT({ admin: true }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(key());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 3600 });
}

export async function endAdminSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, key());
    return true;
  } catch {
    return false;
  }
}
