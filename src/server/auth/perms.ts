import { auth } from "./config";

export type Role = "user" | "curator" | "admin";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

export async function requireRole(...allowed: Role[]) {
  const user = await requireUser();
  const role = ((user as { role?: string }).role ?? "user") as Role;
  if (!allowed.includes(role)) {
    throw new Error("FORBIDDEN");
  }
  return { ...user, role };
}

export async function getOptionalUser() {
  const session = await auth();
  return session?.user ?? null;
}