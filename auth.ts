import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        // #region agent log
        fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'pre-fix',hypothesisId:'C',location:'auth.ts:authorize',message:'login attempt',data:{hasEmail:Boolean(email),hasPassword:Boolean(password),emailLen:email.length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (!email || !password) return null;
        let user;
        try {
          const raw = await prisma.user.findFirst({ where: { email } });
          // #region agent log
          fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'pre-fix',hypothesisId:'C',location:'auth.ts:rawUser',message:'user by email without deletedAt filter',data:{found:Boolean(raw),deletedAtSet:raw?.deletedAt != null,deletedAtType:raw?.deletedAt === undefined ? 'undefined' : raw?.deletedAt === null ? 'null' : 'date'},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          user = raw && !raw.deletedAt ? raw : null;
          // #region agent log
          fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'post-fix',hypothesisId:'C',location:'auth.ts:userAfterFix',message:'user after mongo null-field fix',data:{found:Boolean(user),role:user?.role ?? null},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'pre-fix',hypothesisId:'B',location:'auth.ts:findUser',message:'prisma find user failed',data:{error:String(error)},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          return null;
        }
        // #region agent log
        fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'pre-fix',hypothesisId:'C',location:'auth.ts:userLookup',message:'user lookup result',data:{found:Boolean(user),role:user?.role ?? null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (!user) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
