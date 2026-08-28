import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

void prisma.user.count().then((count) => {
  // #region agent log
  fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'pre-fix',hypothesisId:'B',location:'lib/db.ts',message:'prisma connected',data:{userCount:count,dbHost:process.env.DATABASE_URL?.split('@').pop() ?? 'missing'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}).catch((error) => {
  // #region agent log
  fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'pre-fix',hypothesisId:'B',location:'lib/db.ts',message:'prisma connect failed',data:{error:String(error),dbHost:process.env.DATABASE_URL?.split('@').pop() ?? 'missing'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
});
