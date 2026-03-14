import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthCookieName, verifySessionToken } from "@/lib/auth";
import AdminShell from "@/components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  const user = token ? verifySessionToken(token) : null;

  if (!user || user.role !== "ADMIN") {
    redirect("/auth/sign-in?next=/admin");
  }

  return <AdminShell adminEmail={user.email}>{children}</AdminShell>;
}
