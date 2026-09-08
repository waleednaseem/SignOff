import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVALID_AGREEMENT"
  | "EXPIRED_AGREEMENT"
  | "REVOKED_LINK"
  | "ALREADY_SIGNED"
  | "OLD_VERSION"
  | "INVALID_SIGNATURE"
  | "MISSING_FIELDS"
  | "DUPLICATE"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(code: ApiErrorCode, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { code, message, details } },
    { status },
  );
}

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw Object.assign(new Error("Sign in required"), {
      api: jsonError("UNAUTHORIZED", "Sign in required.", 401),
    });
  }
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw Object.assign(new Error("Forbidden"), {
      api: jsonError("FORBIDDEN", "You do not have access to this resource.", 403),
    });
  }
  return user;
}

export async function requireAdmin() {
  return requireRole(["ADMIN"]);
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export function handleRouteError(error: unknown) {
  if (error && typeof error === "object" && "api" in error) {
    return (error as { api: NextResponse }).api;
  }
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: Array<{ message: string }> }).issues;
    return jsonError("VALIDATION_ERROR", issues[0]?.message ?? "Invalid input.", 400, issues);
  }
  console.error(error);
  return jsonError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
}
