// Auth.js v5 (NextAuth) konfigurace s Drizzle adapterem
// Providers: Google OAuth + Resend magic link (pokud AUTH_RESEND_KEY je nastaven)

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "~/server/db";
import { users, accounts, sessions, verificationTokens } from "~/server/db/schema/auth";
import { env } from "~/lib/env";

const providers = [];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (env.AUTH_RESEND_KEY) {
  providers.push(
    Resend({
      apiKey: env.AUTH_RESEND_KEY,
      from: "noreply@snemovna-cr.cz",
    })
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    error: "/auth/signin",
  },
  session: { strategy: "jwt" },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as { role?: string }).role = (token.role as string) ?? "user";
      }
      return session;
    },
  },
  trustHost: true,
});