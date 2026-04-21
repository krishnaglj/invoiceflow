import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, authUser, authSession, authAccount, authVerification } from "@workspace/db";

const baseURL =
  process.env.BETTER_AUTH_URL ||
  (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:3000");

const trustedOrigins = [
  baseURL,
  ...(process.env.REPLIT_DEV_DOMAIN
    ? [`https://${process.env.REPLIT_DEV_DOMAIN}`]
    : []),
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
  "http://localhost:3000",
  "http://localhost:5173",
];

const googleConfig =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {};

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: googleConfig,
  trustedOrigins,
  advanced: {
    defaultCookieAttributes: {
      // In production, frontend+API are on the same domain → use "lax" (more secure)
      // In Replit dev, they are cross-origin via proxy → use "none" (requires secure:true)
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "none",
      secure: true,
    },
  },
});

export type Auth = typeof auth;
