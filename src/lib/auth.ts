import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
  interface User {
    role: Role;
  }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Throttled last-access tracking: update User.ultimoAcceso at most once
      // every 5 minutes per user, persisting the last sync timestamp in the JWT.
      // We also refresh `name`/`image` from DB so nickname changes propagate
      // into the session without requiring a re-login.
      const userId = token.id as string | undefined;
      if (userId) {
        const now = Date.now();
        const lastSync = (token.lastAccessSync as number | undefined) ?? 0;
        if (now - lastSync > 5 * 60 * 1000) {
          try {
            const updated = await prisma.user.update({
              where: { id: userId },
              data: { ultimoAcceso: new Date(now) },
              select: { name: true, image: true },
            });
            token.lastAccessSync = now;
            if (updated.name !== undefined) token.name = updated.name;
            if (updated.image !== undefined) token.picture = updated.image;
          } catch {
            // Ignore — don't break auth if DB is momentarily unavailable
          }
        }
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});
