import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/app/admin/login/form";
import Logo from "@/components/Logo";
import { isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function AdminLogin() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 py-10">
      <div className="card w-full max-w-[380px] p-7 shadow-card">
        <Logo size={38} suffix="Auctions" />
        <h1 className="mt-6 text-[20px] font-extrabold tracking-[-0.02em]">Admin</h1>
        <p className="mt-1 text-[14px] text-muted">See how each source is doing, and refresh them.</p>
        <LoginForm />
      </div>
    </div>
  );
}
