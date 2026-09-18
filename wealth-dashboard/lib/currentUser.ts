/**
 * Single-user auth stand-in (spec §45: "simple secure authentication
 * suitable for a single-user application... do not over-engineer").
 *
 * This app has exactly one intended user, identified by APP_USER_EMAIL.
 * There is no login screen, session, or password — deployment security
 * relies entirely on the hosting environment not being publicly
 * reachable (e.g. Vercel password protection, or a private network).
 * This is documented as a known limitation in /docs/README.md; adding
 * real multi-user auth (NextAuth, etc.) is a structural non-goal for now
 * but nothing here blocks bolting it on later — every table is already
 * keyed by userId.
 */
import { prisma } from "@/lib/prisma";

const APP_USER_EMAIL = process.env.APP_USER_EMAIL ?? "misoagathachipende@gmail.com";

export async function getCurrentUser() {
  const user = await prisma.user.findUnique({
    where: { email: APP_USER_EMAIL },
    include: { profile: true, careerProfile: true },
  });
  if (!user) {
    throw new Error(
      `No user found for ${APP_USER_EMAIL}. Run "npm run db:seed" to create the seed user.`
    );
  }
  return user;
}
