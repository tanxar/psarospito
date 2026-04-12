import { cookies } from "next/headers";

import { prisma } from "@/db/prisma";
import type { SessionUser } from "@/lib/user-session-types";

import { SESSION_COOKIE_NAME } from "./auth-cookie";
import { verifySessionToken } from "./auth-jwt";

export type PublicUser = SessionUser;

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  brokerOnboardingCompleted: true,
} as const;

export async function getSessionUserFromRequest(): Promise<PublicUser | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const userId = await verifySessionToken(token);
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
    return user;
  } catch {
    return null;
  }
}
