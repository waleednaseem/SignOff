import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const publicPaths = [
  "/login",
  "/register",
  "/agreement/a",
  "/api/auth",
  "/api/public",
  "/api/docs",
  "/api/openapi",
  "/api/reminders/run",
];

const adminOnly = ["/clients", "/templates", "/settings", "/agreements/new"];

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const session = request.auth;
  // #region agent log
  fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'pre-fix',hypothesisId:'E',location:'middleware.ts',message:'middleware',data:{pathname,isPublic,hasSession:Boolean(session?.user),role:session?.user?.role ?? null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (!session?.user && !isPublic && pathname !== "/") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } },
        { status: 401 },
      );
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  const home = session?.user?.role === "CLIENT" ? "/agreements" : "/dashboard";

  if (session?.user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (session?.user?.role === "CLIENT" && (pathname === "/dashboard" || pathname === "/")) {
    return NextResponse.redirect(new URL("/agreements", request.url));
  }

  if (
    session?.user?.role === "CLIENT" &&
    adminOnly.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    return NextResponse.redirect(new URL("/agreements", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
